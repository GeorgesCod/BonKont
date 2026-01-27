/**
 * Script de test pour l'API Firestore
 * Teste les endpoints Firebase Functions
 */

const API_BASE_URL = 'http://127.0.0.1:5001/bonkont-48a2c/europe-west1/api';

async function testAPI() {
  console.log('🧪 Test de l\'API Firestore Bonkont\n');
  console.log('URL de base:', API_BASE_URL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Recherche d'un événement par code (devrait retourner 404)
  console.log('📋 Test 1: Recherche d\'un événement par code');
  try {
    const response = await fetch(`${API_BASE_URL}/events/code/TEST1234`);
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Réponse:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
  console.log('\n');

  // Test 2: Création d'un événement
  console.log('📋 Test 2: Création d\'un événement');
  try {
    const eventData = {
      code: 'TEST1234',
      title: 'Test Event',
      description: 'Événement de test',
      location: 'Paris, France',
      startDate: '2026-05-01',
      endDate: '2026-05-05',
      participantsTarget: 4,
      targetAmountPerPerson: 100,
      organizerId: 'test-organizer@example.com',
      organizerName: 'Test Organizer',
      deadline: 30,
      currency: 'EUR'
    };

    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Réponse:', JSON.stringify(data, null, 2));
    
    if (data.eventId) {
      console.log('✅ Événement créé avec succès! ID:', data.eventId);
      
      // Test 3: Recherche de l'événement créé
      console.log('\n📋 Test 3: Recherche de l\'événement créé');
      const searchResponse = await fetch(`${API_BASE_URL}/events/code/TEST1234`);
      const searchData = await searchResponse.json();
      console.log('Status:', searchResponse.status);
      console.log('Événement trouvé:', JSON.stringify(searchData, null, 2));
      
      // Test 4: Création d'une demande de participation
      if (searchData.id) {
        console.log('\n📋 Test 4: Création d\'une demande de participation');
        const joinResponse = await fetch(`${API_BASE_URL}/events/${searchData.id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'test-participant@example.com',
            email: 'test-participant@example.com',
            name: 'Test Participant'
          }),
        });
        
        const joinData = await joinResponse.json();
        console.log('Status:', joinResponse.status);
        console.log('Réponse:', JSON.stringify(joinData, null, 2));
        
        // Test 5: Récupération des demandes
        if (joinData.success) {
          console.log('\n📋 Test 5: Récupération des demandes de participation');
          const requestsResponse = await fetch(`${API_BASE_URL}/events/${searchData.id}/joinRequests?status=pending`);
          const requestsData = await requestsResponse.json();
          console.log('Status:', requestsResponse.status);
          console.log('Demandes:', JSON.stringify(requestsData, null, 2));
        }
      }
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Tests terminés!');
}

// Exécuter les tests
testAPI().catch(console.error);

 * Script de test pour l'API Firestore
 * Teste les endpoints Firebase Functions
 */

const API_BASE_URL = 'http://127.0.0.1:5001/bonkont-48a2c/europe-west1/api';

async function testAPI() {
  console.log('🧪 Test de l\'API Firestore Bonkont\n');
  console.log('URL de base:', API_BASE_URL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Recherche d'un événement par code (devrait retourner 404)
  console.log('📋 Test 1: Recherche d\'un événement par code');
  try {
    const response = await fetch(`${API_BASE_URL}/events/code/TEST1234`);
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Réponse:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
  console.log('\n');

  // Test 2: Création d'un événement
  console.log('📋 Test 2: Création d\'un événement');
  try {
    const eventData = {
      code: 'TEST1234',
      title: 'Test Event',
      description: 'Événement de test',
      location: 'Paris, France',
      startDate: '2026-05-01',
      endDate: '2026-05-05',
      participantsTarget: 4,
      targetAmountPerPerson: 100,
      organizerId: 'test-organizer@example.com',
      organizerName: 'Test Organizer',
      deadline: 30,
      currency: 'EUR'
    };

    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Réponse:', JSON.stringify(data, null, 2));
    
    if (data.eventId) {
      console.log('✅ Événement créé avec succès! ID:', data.eventId);
      
      // Test 3: Recherche de l'événement créé
      console.log('\n📋 Test 3: Recherche de l\'événement créé');
      const searchResponse = await fetch(`${API_BASE_URL}/events/code/TEST1234`);
      const searchData = await searchResponse.json();
      console.log('Status:', searchResponse.status);
      console.log('Événement trouvé:', JSON.stringify(searchData, null, 2));
      
      // Test 4: Création d'une demande de participation
      if (searchData.id) {
        console.log('\n📋 Test 4: Création d\'une demande de participation');
        const joinResponse = await fetch(`${API_BASE_URL}/events/${searchData.id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'test-participant@example.com',
            email: 'test-participant@example.com',
            name: 'Test Participant'
          }),
        });
        
        const joinData = await joinResponse.json();
        console.log('Status:', joinResponse.status);
        console.log('Réponse:', JSON.stringify(joinData, null, 2));
        
        // Test 5: Récupération des demandes
        if (joinData.success) {
          console.log('\n📋 Test 5: Récupération des demandes de participation');
          const requestsResponse = await fetch(`${API_BASE_URL}/events/${searchData.id}/joinRequests?status=pending`);
          const requestsData = await requestsResponse.json();
          console.log('Status:', requestsResponse.status);
          console.log('Demandes:', JSON.stringify(requestsData, null, 2));
        }
      }
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Tests terminés!');
}

// Exécuter les tests
testAPI().catch(console.error);












