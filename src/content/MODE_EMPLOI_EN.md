# BonKont User Manual

**Good accounts make good friends.**

This guide describes how to use BonKont for all users: creating an account, joining or creating an event, managing shared expenses, validating transactions, and closing events properly.

---

## 1. What is BonKont?

BonKont is an application for **managing and sharing expenses** during private events: trips, outings, shared housing, collective projects. It allows you to:

- **Create an event** with a budget, duration, and participants.
- **Record expenses** (who paid what, for whom) and **contributions to the pot** (common fund).
- **Automatically calculate** balances and who owes what to whom.
- **Close** the event with a shared summary (PDF) and collective validation.

BonKont **does not handle bank payments**: it calculates and displays amounts; transfers or reimbursements are made between you.

---

## 2. Account and login

### 2.1 Create an account

1. Open BonKont (app or website).
2. Click **Login** then **Register**.
3. Enter your **email** and a **password** (and optionally a name or nickname).
4. Confirm registration.

An account is **required** to join an event and to validate transactions.

### 2.2 Log in

- From the home screen, click **Login** and enter your email and password.

### 2.3 Logout and settings

- **Settings** (gear icon): account, preferences (currency, language, light/dark theme), information pages (privacy, terms, FAQ, contact), help and Bonkont rule guide.
- **Logout**: from Settings > Account, or from the menu depending on the interface.

---

## 3. Join an event

To participate in an event, you must **be invited** (code, QR code or link) and **be validated by the organizer**.

### 3.1 Get the code

The organizer provides you with:

- The **event code** (8 letters, e.g.: `JELHFMFA`), or  
- A **QR code** to scan, or  
- A **link (URL)** of the type `https://bonkont-48a2c.web.app/#/join/CODE` or `https://bonkont-48a2c.web.app/#event/CODE`.

### 3.2 Enter the code or scan the QR

1. From the home screen, go to **Join an event** (or open the link with the code).
2. **Manual entry**: enter the 8-letter code (spaces and non-alphabetic characters are ignored).
3. **QR code**: use the button to open the scanner and scan the QR code.
4. You must be **logged in**. If not, the app will ask you to log in or create an account.

### 3.3 Participation request

- After entering a valid code, you see the **event information** (name, etc.) but **not yet the list of participants or accounts**.
- Send a **participation request**: your details (name, email) are sent to the **organizer**.
- The organizer **accepts or declines** your request.
- Once **accepted**, you access the event like other participants (dashboard, transactions, balances, closure).

**Important**: the code does not give direct access to financial data; it only allows you to create a request that the organizer must validate.

### 3.4 If your request is pending

You can view the event info but not yet add or validate transactions. Wait for the organizer's validation (a notification may be offered by the app).

---

## 4. Create an event

Only a **logged-in** user can create an event. Creation is done in **5 steps**.

### Step 1/5 – Basic information

- **Event name** (e.g.: Florence trip).
- **Description** (optional).
- **Start date**.
- **Event code**: generated automatically (8 letters). You can **copy** it to share with participants right away.

### Step 2/5 – Budget and duration

- **Total budget**: indicative amount (e.g.: 1000 €) and **currency** (EUR, USD, GBP).
- **Duration**: in **days** OR **end date**.
- **Payment deadline**: number of **days after the end** of the event for participants to settle their balances (e.g.: 30).
- **Expected number of participants** (optional): used to display a target share per person.

### Step 3/5 – Location

- **Location** (optional): address or venue of the event for display and sharing.

### Step 4/5 – Participants and charter

- **Organizer**: you are automatically **participant #1** and **organizer**. You will be the one who can **close** the event.
- **Equity and commitment charter**: read the charter (transparency, transaction validation, payment on time, etc.) and **accept** by checking the box. By checking, you also accept the organizer's role (initiator, moderator, responsible for closure).
- Other participants **then join** the event with the **code** (see section 3).

### Step 5/5 – Summary and creation

- Review the information (event, budget, amount per person calculated, etc.).
- **Create event** button: the event is created and you are redirected to its management. You can **share the code** (or QR code) to invite participants.

**Note**: after creation, **settings** (budget, duration, payment deadline, etc.) may be **locked** when the event is activated; check the interface for details.

---

## 5. Manage an event

Once the event is created (or joined and accepted), you access its **dashboard**: managing participants, transactions, and balances.

### 5.1 Available views

Depending on the screen, you may have:

- **Management / Overview**: participants, balances, summary, Bonkont rule reminder.
- **Transactions**: list of transactions, adding expenses, contributions, transfers.
- **Closure**: reflection period, collective validation, final summary and PDF.

The **organizer** has full rights; **participants** can view balances, validate transactions, and take part in closure as described below.

### 5.2 Participants

- **Participant list**: names, status (confirmed, pending), role (organizer).
- **Pending requests**: if you are the organizer, you can **accept** or **decline** participation requests sent via the code.
- Participants must be **validated** for their transactions and validations to count.

### 5.3 Transaction types

BonKont distinguishes four transaction types, all **validated** for traceability:

| Type | Description | Fair sharing? |
|------|-------------|----------------|
| **Pot contributions** | A participant pays money into the common pot (e.g.: cash). | Yes: validated and shared fairly (all concerned "consume" their share). |
| **Expenses / Advances** | A participant pays an expense for the group (groceries, restaurant, etc.). | Yes: the payer advances the total, each (including them) "consumes" their share pro rata; the payer is reimbursed by the others. |
| **Direct transfers** | Direct payment from one participant to another (reimbursement outside the pot). | No: validated for traceability only. |
| **Pot reimbursements** | Reimbursement from the pot to a participant. | No: validated for traceability only. |

**Important rule**: for **expenses/advances**, only participants who **validate** the transaction are **included** in the split. If only part of the group validates (e.g.: meal in town), only those participants are included.

### 5.4 Add a transaction

From the **Transactions** section (or equivalent):

1. **Expense (purchase)**  
   - Choose "Expense" or "Manual entry – expense".  
   - Enter the **amount**, **store** (or description), **payer** and **concerned participants**.  
   - **Ticket scan** option: photo of the receipt to pre-fill amount and store (OCR).  
   - The transaction must be **validated** by each concerned participant (Bonkont rule).

2. **Pot contribution**  
   - Choose "Pot contribution (cash)" (or equivalent).  
   - Enter the **amount** and the **contributor**.  
   - Each participant must **validate** this contribution.  
   - The contribution feeds the contributor's **pot**; it can be used to pay expenses (withdrawal from pot = "advance in practice") or be reimbursed later.

3. **Direct transfer**  
   - Direct payment from one participant to another: enter sender, recipient and amount. Validated for traceability.

4. **Pot reimbursement**  
   - Reimbursement from the pot to a participant: validated for traceability.

After saving, **balances** are recalculated automatically.

### 5.5 Transaction validation (Bonkont rule)

- **Every** transaction (contribution, expense, transfer, pot reimbursement) must be **validated** by the concerned participants (as shown in the app).
- For an **expense**: by validating, you accept to be **included** in the split (you "consume" your share pro rata).
- The organizer can, after a reminder, **validate on behalf of** a participant who is late.

### 5.6 Balances and split

- **Contribution**: amount paid into the pot (actual, validated).  
- **Withdrawn**: part already used for group expenses (= advance in practice).  
- **Remaining in pot**: what is still available (future expenses or reimbursement).  
- **Advanced**: actual advances + amount withdrawn from the pot (advance in practice).  
- **Consumed**: your total share of expenses (pro rata of concerned participants).  
- **Stake**: equivalent of "what you put in" (advances + pot withdrawals, minus reimbursements received, etc.).  
- **Balance**: Stake − Consumed.  
  - **Balance > 0**: you should **receive** money.  
  - **Balance < 0**: you should **pay** money.  
  - **Balance = 0**: you are even.

The "Participant detail" and "Balances" screens show these indicators; a **PDF export** (from management or closure) gives a printable summary.

### 5.7 Invite friends / share the code

- From the event page: **share the code** (copy) or **QR code** to display or send.  
- You can also use **Invite friends** if the option is offered (sending the link or code depending on the app).

---

## 6. Event closure

Closure **locks** the event and produces a **final shared summary** (PDF). It is started by the **organizer** and subject to a **reflection period** and **collective validation**.

### 6.1 Reflection period (H+48)

- At the **end** of the event (end date from start date and duration), a **48-hour** (H+48) period applies before closure is possible.
- During this period, everyone can **check the accounts**, transactions and balances.
- A **countdown** may be displayed (hours, minutes, seconds remaining).

### 6.2 Launch closure

- Once the H+48 period has passed, the **organizer** can **launch closure** from the **Closure** tab/view.
- The app calculates **final balances** and **transfers** between participants.

### 6.3 Collective validation

- **Each participant** must **validate** the closure (dedicated button, optionally with comment or e-signature).
- Once **all** participants have validated, the event is marked as **closed and locked**.
- **Settings and transactions** can no longer be changed after validated closure.

### 6.4 Summary and PDF

- A **final summary** is displayed: balances per participant, transfers to make, balance status.
- A **PDF** can be **downloaded**: titled e.g. "Event Closure", it contains the balance details (Contribution, Advanced, Consumed, Stake, Balance), collective validations and any warnings (incomplete split, etc.).
- This PDF serves as **shared proof** for reimbursements between participants.

---

## 7. Settings and help

### 7.1 Settings (account, preferences)

Accessible via the **Settings** icon:

- **Account**: email, password reset, logout, account deletion.
- **Preferences**:  
  - **Currency**: EUR, USD, GBP.  
  - **Language**: French / English (applies to public pages and settings).  
  - **Theme**: Light / Dark.
- **Information pages**: links to Privacy policy, Terms, FAQ, Contact.
- **Help**: **Bonkont rule** guide (see below).

### 7.2 The Bonkont rule (summary)

- **Key phrase**: *"You Validate, You Consume, You Receive or You Pay, You are Even."*
- **Validation**: as soon as you validate a transaction (expense or contribution), you are included in the fair split.
- **Sharing**: the payer advances the **total**; each (including them) **consumes** their share (amount ÷ number of concerned participants); the payer **receives** reimbursement from the others.
- **Balance**: balances (Stake − Consumed) show who should receive or pay to be "even".

The full detail (examples, partial cases, pot contribution, direct transfers, pot reimbursements) is in the **Help** tab of Settings.

---

## 8. Quick FAQ

- **Does BonKont handle payments?**  
  No. BonKont calculates amounts and shows who owes what; transfers are between you.

- **Do I need an account to join an event?**  
  Yes. An account is required to send a participation request and to validate transactions.

- **Does the code give direct access to accounts?**  
  No. The code allows you to create a **participation request**; the organizer must **accept** the request for you to access the event data.

- **Can we change an event after closure?**  
  No. Once closed and collectively validated, the event is locked.

- **Why a delay (H+48) before closure?**  
  To give everyone time to check the accounts before locking the balances.

- **Multiple events at the same time?**  
  You cannot create or join several events that **overlap in time** (one person cannot be in two places at once); the system checks for date conflicts.

---

## 9. Support

- **FAQ**: Settings > Help / Public pages > FAQ.  
- **Contact**: Settings > Contact (or Contact page) for questions, feedback or issues.  
- **Privacy and Terms**: accessible from Settings or information pages.

---

*Bonkont does the accounting, Friends do the rest.*
