// payment.js
// Checkout page — renders order summary and opens Razorpay checkout.
//
// IMPORTANT (backend requirement):
// Razorpay requires an order to be created server-side before checkout.open() —
// you cannot charge a card/UPI with only a client-side key. This file expects a
// backend endpoint at POST /api/payments/create-order that takes { plan } and
// returns { orderId, amount, currency, keyId }. Wire that endpoint up in your
// FastAPI backend, then set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET as server env vars.
// Until that endpoint exists, this page will show a clear error instead of failing silently.

import { icon } from '../js/components/icons.js';

const PLANS = {
  starter: {
    name: 'Starter',
    icon: 'zap',
    period: 'Billed monthly',
    amount: 49,
    strikeAmount: 199,
  },
  pro: {
    name: 'Pro',
    icon: 'rocket',
    period: 'Billed yearly',
    amount: 399,
    strikeAmount: 499,
  },
};

const params = new URLSearchParams(window.location.search);
const planId = params.get('plan');
const plan = PLANS[planId];

const summaryEl = document.getElementById('pay-summary');
const backLink = document.getElementById('pay-back-link');

let selectedMethod = 'upi';

function renderSummary() {
  if (!plan) {
    summaryEl.innerHTML = `
      <div class="empty-state">
        ${icon('x-circle', 32)}
        <p class="empty-state__text">No plan selected. Go back and choose a plan first.</p>
      </div>
    `;
    document.getElementById('pay-submit-btn').disabled = true;
    return;
  }

  backLink.href = `plans.html?plan=${planId}`;

  const discount = plan.strikeAmount - plan.amount;

  summaryEl.innerHTML = `
    <div class="pay-summary__plan-row">
      <span class="pay-summary__icon">${icon(plan.icon, 20)}</span>
      <div>
        <div class="pay-summary__plan-name">${plan.name} plan</div>
        <div class="pay-summary__plan-period">${plan.period}</div>
      </div>
    </div>
    <div class="pay-summary__row">
      <span class="pay-summary__row-label">Plan price</span>
      <span class="pay-summary__row-value">₹${plan.strikeAmount}</span>
    </div>
    <div class="pay-summary__row">
      <span class="pay-summary__row-label">Discount</span>
      <span class="pay-summary__row-value pay-summary__discount">−₹${discount}</span>
    </div>
    <div class="pay-summary__row pay-summary__row--total">
      <span class="pay-summary__row-label">Total due today</span>
      <span class="pay-summary__row-value">₹${plan.amount}</span>
    </div>
  `;
}

function renderIcons() {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, 20);
  });
}

function wireMethodSelection() {
  const options = document.querySelectorAll('.pay-method-option');
  options.forEach((opt) => {
    opt.addEventListener('click', () => {
      options.forEach((o) => o.classList.remove('is-selected'));
      opt.classList.add('is-selected');
      selectedMethod = opt.dataset.method;
    });
  });
}

function showStatus(type, title, message) {
  const layout = document.querySelector('.pay-layout');
  const isSuccess = type === 'success';
  layout.innerHTML = `
    <div class="pay-status card" style="grid-column: 1 / -1;">
      <span class="pay-status__icon pay-status__icon--${type}">
        ${icon(isSuccess ? 'check-circle' : 'x-circle', 28)}
      </span>
      <h2>${title}</h2>
      <p>${message}</p>
      <a class="btn ${isSuccess ? 'btn-primary' : 'btn-secondary'}" href="${isSuccess ? '../auth/login.html' : 'plans.html'}">
        ${isSuccess ? 'Go to log in' : 'Back to plans'}
      </a>
    </div>
  `;
}

async function createOrder() {
  const res = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: planId, method: selectedMethod }),
  });

  if (!res.ok) {
    throw new Error('Order creation failed');
  }

  return res.json();
}

async function handlePay() {
  const btn = document.getElementById('pay-submit-btn');
  const label = document.getElementById('pay-submit-label');

  btn.disabled = true;
  label.textContent = 'Preparing checkout…';

  let order;
  try {
    order = await createOrder();
  } catch (err) {
    btn.disabled = false;
    label.textContent = 'Pay securely';
    showStatus(
      'error',
      'Checkout isn\u2019t connected yet',
      'The backend endpoint /api/payments/create-order isn\u2019t wired up yet, so Razorpay can\u2019t start a real payment. Connect this route in your FastAPI backend with your Razorpay key/secret to go live.'
    );
    return;
  }

  const options = {
    key: order.keyId,
    amount: order.amount,
    currency: order.currency || 'INR',
    name: 'CareerOS',
    description: `${plan.name} plan`,
    order_id: order.orderId,
    method: {
      upi: selectedMethod === 'upi',
      card: selectedMethod === 'card',
      netbanking: selectedMethod === 'netbanking',
    },
    theme: { color: '#1F7A52' },
    handler: function (response) {
      showStatus(
        'success',
        'Payment successful',
        `Your ${plan.name} plan is now active. Payment ID: ${response.razorpay_payment_id}`
      );
    },
    modal: {
      ondismiss: function () {
        btn.disabled = false;
        label.textContent = 'Pay securely';
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (response) {
    showStatus(
      'error',
      'Payment failed',
      response.error && response.error.description
        ? response.error.description
        : 'Something went wrong while processing your payment. No amount was charged.'
    );
  });
  rzp.open();
}

renderSummary();
renderIcons();
wireMethodSelection();

const submitBtn = document.getElementById('pay-submit-btn');
if (submitBtn && !submitBtn.disabled) {
  submitBtn.addEventListener('click', handlePay);
}
