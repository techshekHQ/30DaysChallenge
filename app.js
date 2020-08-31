const express = require('express');
const hbs = require('hbs');
const app = express();
const {
  resolve
} = require('path');
// Copy the .env.example in the root into a .env file in this folder
require('dotenv').config({
  path: './.env'
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


app.use(express.static(process.env.STATIC_DIR));
app.use(
  express.json({
    // We need the raw body to verify webhook signatures.
    // Let's compute it only when hitting the Stripe webhook endpoint.
    verify: function(req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    },
  })
);

hbs.registerPartials(__dirname + '/views/partials');

app.get('/', (req, res) => {
  res.status(200).render('index.hbs')
});

app.get('/success', (req, res) => {
  res.status(200).render('profile.hbs', {
    msg: 'Please create a password against your name and email.',
    email_note: 'Verification is pending.'
  });
})

app.get('/challenge', (req, res) => {
  let box = [];
  for (var i = 1; i < 31; i++) {
    switch (true) {
      case i == 1:
        box.push({
          number: i,
          past: 'true',
          locked: 'true',
          logged: 'true',
          feelingType: 1,
          feeling: '/emojis/depressed.svg',
          comments: 'I am feeling kind of happy today. Let`s see till what point can I get moving'
        })
        break;
      case i == 2:
        box.push({
          number: i,
          past: 'true',
          locked: 'true',
          logged: 'true',
          feelingType: 2,
          feeling: '/emojis/exhausted.svg',
          comments: 'I am feeling kind of happy today. Let`s see till what point can I get moving'
        })
        break;
      case i == 3:
        box.push({
          number: i,
          past: 'true',
          locked: 'true',
          logged: 'true',
          feelingType: 3,
          feeling: '/emojis/bored.svg',
          comments: 'I am feeling kind of happy today. Let`s see till what point can I get moving'
        })
        break;
      case i == 4:
        box.push({
          number: i,
          past: 'true',
          locked: 'true',
          logged: 'true',
          feelingType: 4,
          feeling: '/emojis/happy.svg',
          comments: 'I am feeling kind of happy today. Let`s see till what point can I get moving'
        })
        break;
      case i == 5:
        box.push({
          number: i,
          past: 'true',
          locked: 'true',
          logged: 'true',
          feelingType: 5,
          feeling: '/emojis/flow.svg',
          comments: 'I am feeling kind of happy today. Let`s see till what point can I get moving'
        })
        break;
      case i == 6:
        box.push({
          number: i,
          present: 'true',
          locked:'false'
        })
        break;
      default:
        box.push({
          number: i,
          future: 'true',
          locked:'true'
        });
    }

  }
  res.status(200).render('challenge.hbs', {
    box
  });
})

app.get('/challenges', (req,res) => {
  res.status(200).render('challenges.hbs');
})

app.get('/profile', (req,res) => {
  res.status(200).render('profile.hbs');
})

app.get('/config', async (req, res) => {
  const price = await stripe.prices.retrieve(process.env.PRICE);

  res.send({
    publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
    unitAmount: price.unit_amount,
    currency: price.currency,
  });
});

app.get('/checkout', (req, res) => {
  res.status(200).render('checkout.hbs');
})

// Fetch the Checkout Session to display the JSON result on the success page
app.get('/checkout-session', async (req, res) => {
  const {
    sessionId
  } = req.query;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  res.send(session);
});

app.post('/create-checkout-session', async (req, res) => {
  const domainURL = process.env.DOMAIN;

  const {
    quantity,
    locale,
    userInput
  } = req.body;
  console.log(userInput);
  // Create new Checkout Session for the order
  // Other optional params include:
  // [billing_address_collection] - to display billing address details on the page
  // [customer] - if you have an existing Stripe Customer ID
  // [customer_email] - lets you prefill the email input in the Checkout page
  // For full details see https://stripe.com/docs/api/checkout/sessions/create
  const session = await stripe.checkout.sessions.create({
    payment_method_types: process.env.PAYMENT_METHODS.split(', '),
    mode: 'subscription',
    locale: locale,
    line_items: [{
      price: process.env.PRICE,
      quantity: quantity
    }],
    // ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
    // payment_intent_data: {
    //   metadata: {
    //     userInput: userInput
    //   },
    // },
    success_url: `${domainURL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${domainURL}/`,
  });

  res.send({
    sessionId: session.id,
  });
});

// Webhook handler for asynchronous events.
app.post('/webhook', async (req, res) => {
  let data;
  let eventType;
  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  if (eventType === 'checkout.session.completed') {
    console.log(`🔔  Payment received!`);
  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log(`Node server listening on port ${3000}!`));
