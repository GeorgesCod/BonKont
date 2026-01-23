/**
 * Firebase Functions pour BONKONT
 * Backend API avec Express pour gérer les événements, participants et transactions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Initialiser Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Créer l'application Express
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    body: req.body,
    params: req.params,
    query: req.query
  });
  next();
});

/**
 * GET /api/events/code/:code
 * Recherche un événement par son code
 */
app.get("/api/events/code/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!cleanCode || cleanCode.length < 4) {
      return res.status(400).json({ 
        error: "Code invalide",
        message: "Le code événement doit contenir au moins 4 caractères"
      });
    }

    logger.info(`[API] Searching event by code: ${cleanCode}`);

    // Rechercher l'événement par code
    const snapshot = await db
      .collection("events")
      .where("code", "==", cleanCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logger.info(`[API] Event not found for code: ${cleanCode}`);
      return res.status(404).json({ 
        error: "Event not found",
        message: "Aucun événement trouvé avec ce code"
      });
    }

    const doc = snapshot.docs[0];
    const eventData = doc.data();

    // Récupérer les participants
    const participantsSnapshot = await db
      .collection("events")
      .doc(doc.id)
      .collection("participants")
      .get();

    const participants = participantsSnapshot.docs.map(pDoc => ({
      id: pDoc.id,
      ...pDoc.data()
    }));

    // Formater la réponse selon le schéma attendu par le frontend
    const event = {
      id: doc.id,
      code: eventData.code,
      title: eventData.title,
      description: eventData.description || '',
      location: eventData.location || null,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      amount: eventData.targetAmountPerPerson * (eventData.participantsTarget || 1),
      deadline: eventData.deadline || 30,
      currency: eventData.currency || 'EUR',
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName || '',
      participants: participants,
      status: eventData.status || 'open',
      createdAt: eventData.createdAt,
      closedAt: eventData.closedAt || null
    };

    logger.info(`[API] Event found: ${doc.id} - ${eventData.title}`);
    res.json(event);
  } catch (error) {
    logger.error("[API] Error fetching event by code:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

/**
 * POST /api/events/:eventId/join
 * Crée une demande de participation pour un événement
 */
app.post("/api/events/:eventId/join", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId, email, name } = req.body;

    // Validation
    if (!userId || !name || !name.trim()) {
      return res.status(400).json({ 
        error: "Données manquantes",
        message: "userId et name sont requis"
      });
    }

    logger.info(`[API] Creating join request for event: ${eventId}`, {
      userId,
      email,
      name
    });

    // Vérifier que l'événement existe
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ 
        error: "Event not found",
        message: "L'événement n'existe pas"
      });
    }

    // Vérifier si l'utilisateur n'a pas déjà une demande en attente
    const existingRequest = await db
      .collection("events")
      .doc(eventId)
      .collection("joinRequests")
      .where("userId", "==", userId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingRequest.empty) {
      return res.status(409).json({ 
        error: "Request already exists",
        message: "Vous avez déjà une demande en attente pour cet événement"
      });
    }

    // Créer la demande de participation
    const joinRequestRef = await db
      .collection("events")
      .doc(eventId)
      .collection("joinRequests")
      .add({
        userId,
        email: email || '',
        name: name.trim(),
        status: "pending",
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedAt: null
      });

    logger.info(`[API] Join request created: ${joinRequestRef.id}`);

    res.json({ 
      success: true,
      requestId: joinRequestRef.id,
      message: "Demande de participation créée avec succès"
    });
  } catch (error) {
    logger.error("[API] Error creating join request:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

/**
 * GET /api/events/:eventId/joinRequests
 * Récupère les demandes de participation pour un événement (pour l'organisateur)
 */
app.get("/api/events/:eventId/joinRequests", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query; // Optionnel: filtrer par statut

    logger.info(`[API] Fetching join requests for event: ${eventId}`, { status });

    let query = db
      .collection("events")
      .doc(eventId)
      .collection("joinRequests");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ requests });
  } catch (error) {
    logger.error("[API] Error fetching join requests:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

/**
 * PATCH /api/events/:eventId/joinRequests/:requestId
 * Approuve ou refuse une demande de participation
 */
app.patch("/api/events/:eventId/joinRequests/:requestId", async (req, res) => {
  try {
    const { eventId, requestId } = req.params;
    const { action, organizerId } = req.body; // action: "approve" ou "reject"

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({ 
        error: "Action invalide",
        message: "L'action doit être 'approve' ou 'reject'"
      });
    }

    logger.info(`[API] ${action} join request: ${requestId} for event: ${eventId}`);

    // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ 
        error: "Event not found"
      });
    }

    const eventData = eventDoc.data();
    if (eventData.organizerId !== organizerId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Seul l'organisateur peut approuver ou refuser les demandes"
      });
    }

    // Mettre à jour la demande
    const requestRef = db
      .collection("events")
      .doc(eventId)
      .collection("joinRequests")
      .doc(requestId);

    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
      return res.status(404).json({ 
        error: "Request not found"
      });
    }

    const updateData = {
      status: action === "approve" ? "approved" : "rejected",
      approvedAt: action === "approve" 
        ? admin.firestore.FieldValue.serverTimestamp() 
        : null
    };

    await requestRef.update(updateData);

    // Si approuvé, ajouter le participant à la collection participants
    if (action === "approve") {
      const requestData = requestDoc.data();
      await db
        .collection("events")
        .doc(eventId)
        .collection("participants")
        .doc(requestData.userId)
        .set({
          userId: requestData.userId,
          name: requestData.name,
          email: requestData.email || '',
          role: "participant",
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          approved: true
        });
    }

    res.json({ 
      success: true,
      message: `Demande ${action === "approve" ? "approuvée" : "refusée"} avec succès`
    });
  } catch (error) {
    logger.error("[API] Error updating join request:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

/**
 * POST /api/events
 * Crée un nouvel événement (pour l'organisateur)
 */
app.post("/api/events", async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      location,
      startDate,
      endDate,
      participantsTarget,
      targetAmountPerPerson,
      organizerId,
      organizerName,
      deadline,
      currency
    } = req.body;

    // Validation
    if (!code || !title || !organizerId) {
      return res.status(400).json({ 
        error: "Données manquantes",
        message: "code, title et organizerId sont requis"
      });
    }

    logger.info(`[API] Creating event: ${title} (${code})`);

    // Vérifier que le code n'existe pas déjà
    const existingEvent = await db
      .collection("events")
      .where("code", "==", code.toUpperCase())
      .limit(1)
      .get();

    if (!existingEvent.empty) {
      return res.status(409).json({ 
        error: "Code already exists",
        message: "Un événement avec ce code existe déjà"
      });
    }

    // Créer l'événement
    const eventRef = await db.collection("events").add({
      code: code.toUpperCase(),
      title,
      description: description || '',
      location: location || null,
      startDate,
      endDate,
      participantsTarget: participantsTarget || 1,
      targetAmountPerPerson: targetAmountPerPerson || 0,
      organizerId,
      organizerName: organizerName || '',
      deadline: deadline || 30,
      currency: currency || 'EUR',
      status: "open",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      closedAt: null
    });

    // Ajouter l'organisateur comme participant
    await db
      .collection("events")
      .doc(eventRef.id)
      .collection("participants")
      .doc(organizerId)
      .set({
        userId: organizerId,
        name: organizerName || '',
        email: '',
        role: "organizer",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        approved: true
      });

    logger.info(`[API] Event created: ${eventRef.id}`);

    res.status(201).json({ 
      success: true,
      eventId: eventRef.id,
      message: "Événement créé avec succès"
    });
  } catch (error) {
    logger.error("[API] Error creating event:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  logger.error("[API] Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: err.message 
  });
});

// Exporter la fonction Firebase
exports.api = onRequest({
  cors: true,
  region: 'europe-west1' // Ajuster selon votre région préférée
}, app);

app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    body: req.body,
    params: req.params,
    query: req.query
  });
  next();
});

/**
 * GET /api/events/code/:code
 * Recherche un événement par son code
 */
app.get("/api/events/code/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!cleanCode || cleanCode.length < 4) {
      return res.status(400).json({ 
        error: "Code invalide",
        message: "Le code événement doit contenir au moins 4 caractères"
      });
    }

    logger.info(`[API] Searching event by code: ${cleanCode}`);

    // Rechercher l'événement par code
    const snapshot = await db
      .collection("events")
      .where("code", "==", cleanCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logger.info(`[API] Event not found for code: ${cleanCode}`);
      return res.status(404).json({ 
        error: "Event not found",
        message: "Aucun événement trouvé avec ce code"
      });
    }

    const doc = snapshot.docs[0];
    const eventData = doc.data();

    // Récupérer les participants
    const participantsSnapshot = await db
      .collection("events")
      .doc(doc.id)
      .collection("participants")
      .get();

    const participants = participantsSnapshot.docs.map(pDoc => ({
      id: pDoc.id,
      ...pDoc.data()
    }));

    // Formater la réponse selon le schéma attendu par le frontend
    const event = {
      id: doc.id,
      code: eventData.code,
      title: eventData.title,
      description: eventData.description || '',
      location: eventData.location || null,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      amount: eventData.targetAmountPerPerson * (eventData.participantsTarget || 1),
      deadline: eventData.deadline || 30,
      currency: eventData.currency || 'EUR',
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName || '',
      participants: participants,
      status: eventData.status || 'open',
      createdAt: eventData.createdAt,
      closedAt: eventData.closedAt || null
    };

    logger.info(`[API] Event found: ${doc.id} - ${eventData.title}`);
    res.json(event);
  } catch (error) {
    logger.error("[API] Error fetching event by code:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

/**
 * POST /api/events/:eventId/join
 * Crée une demande de participation pour un événement
 */
app.post("/api/events/:eventId/join", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId, email, name } = req.body;

    // Validation
    if (!userId || !name || !name.trim()) {
      return res.status(400).json({ 
        error: "Données manquantes",
        message: "userId et name sont requis"
      });
    }

    logger.info(`[API] Creating join request for event: ${eventId}`, {
      userId,
      email,
      name
    });

    // Vérifier que l'événement existe
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ 
        error: "Event not found",
        message: "L'événement n'existe pas"
      });
    }

    // Vérifier si l'utilisateur n'a pas déjà une demande en attente
    const existingRequest = await db
      .collection("events")
      .doc(eventId)
      .collection("joinRequests")
      .where("userId", "==", userId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingRequest.empty) {
      return res.status(409).json({ 
        error: "Request already exists",
        message: "Vous avez déjà une demande en attente pour cet événement"
      });
    }

    // Créer la demande de participation
    const joinRequestRef = await db
      .collection("events")
      .doc(eventId)
      .collection("joinRequests")
      .add({
        userId,
        email: email || '',
        name: name.trim(),
        status: "pending",
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedAt: null
      });

    logger.info(`[API] Join request created: ${joinRequestRef.id}`);

    res.json({ 
      success: true,
      requestId: joinRequestRef.id,
      message: "Demande de participation créée avec succès"
    });
  } catch (error) {
    logger.error("[API] Error creating join request:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

/**
 * GET /api/events/:eventId/joinRequests
 * Récupère les demandes de participation pour un événement (pour l'organisateur)
 */
app.get("/api/events/:eventId/joinRequests", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query; // Optionnel: filtrer par statut

    logger.info(`[API] Fetching join requests for event: ${eventId}`, { status });

    let query = db
      .collection("events")
      .doc(eventId)
      .collection("joinRequests");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ requests });
  } catch (error) {
    logger.error("[API] Error fetching join requests:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

/**
 * PATCH /api/events/:eventId/joinRequests/:requestId
 * Approuve ou refuse une demande de participation
 */
app.patch("/api/events/:eventId/joinRequests/:requestId", async (req, res) => {
  try {
    const { eventId, requestId } = req.params;
    const { action, organizerId } = req.body; // action: "approve" ou "reject"

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({ 
        error: "Action invalide",
        message: "L'action doit être 'approve' ou 'reject'"
      });
    }

    logger.info(`[API] ${action} join request: ${requestId} for event: ${eventId}`);

    // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ 
        error: "Event not found"
      });
    }

    const eventData = eventDoc.data();
    if (eventData.organizerId !== organizerId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Seul l'organisateur peut approuver ou refuser les demandes"
      });
    }

    // Mettre à jour la demande
    const requestRef = db
      .collection("events")
      .doc(eventId)
      .collection("joinRequests")
      .doc(requestId);

    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
      return res.status(404).json({ 
        error: "Request not found"
      });
    }

    const updateData = {
      status: action === "approve" ? "approved" : "rejected",
      approvedAt: action === "approve" 
        ? admin.firestore.FieldValue.serverTimestamp() 
        : null
    };

    await requestRef.update(updateData);

    // Si approuvé, ajouter le participant à la collection participants
    if (action === "approve") {
      const requestData = requestDoc.data();
      await db
        .collection("events")
        .doc(eventId)
        .collection("participants")
        .doc(requestData.userId)
        .set({
          userId: requestData.userId,
          name: requestData.name,
          email: requestData.email || '',
          role: "participant",
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          approved: true
        });
    }

    res.json({ 
      success: true,
      message: `Demande ${action === "approve" ? "approuvée" : "refusée"} avec succès`
    });
  } catch (error) {
    logger.error("[API] Error updating join request:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

/**
 * POST /api/events
 * Crée un nouvel événement (pour l'organisateur)
 */
app.post("/api/events", async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      location,
      startDate,
      endDate,
      participantsTarget,
      targetAmountPerPerson,
      organizerId,
      organizerName,
      deadline,
      currency
    } = req.body;

    // Validation
    if (!code || !title || !organizerId) {
      return res.status(400).json({ 
        error: "Données manquantes",
        message: "code, title et organizerId sont requis"
      });
    }

    logger.info(`[API] Creating event: ${title} (${code})`);

    // Vérifier que le code n'existe pas déjà
    const existingEvent = await db
      .collection("events")
      .where("code", "==", code.toUpperCase())
      .limit(1)
      .get();

    if (!existingEvent.empty) {
      return res.status(409).json({ 
        error: "Code already exists",
        message: "Un événement avec ce code existe déjà"
      });
    }

    // Créer l'événement
    const eventRef = await db.collection("events").add({
      code: code.toUpperCase(),
      title,
      description: description || '',
      location: location || null,
      startDate,
      endDate,
      participantsTarget: participantsTarget || 1,
      targetAmountPerPerson: targetAmountPerPerson || 0,
      organizerId,
      organizerName: organizerName || '',
      deadline: deadline || 30,
      currency: currency || 'EUR',
      status: "open",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      closedAt: null
    });

    // Ajouter l'organisateur comme participant
    await db
      .collection("events")
      .doc(eventRef.id)
      .collection("participants")
      .doc(organizerId)
      .set({
        userId: organizerId,
        name: organizerName || '',
        email: '',
        role: "organizer",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        approved: true
      });

    logger.info(`[API] Event created: ${eventRef.id}`);

    res.status(201).json({ 
      success: true,
      eventId: eventRef.id,
      message: "Événement créé avec succès"
    });
  } catch (error) {
    logger.error("[API] Error creating event:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  logger.error("[API] Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: err.message 
  });
});

// Exporter la fonction Firebase
exports.api = onRequest({
  cors: true,
  region: 'europe-west1' // Ajuster selon votre région préférée
}, app);
