// plans.js
// Plan-detail page (lives inside /payment). Reads ?plan= from the URL and renders details + payment link.
import { icon } from '../js/components/icons.js';

const PLANS = {
  free: {
    name: 'Free',
    badge: null,
    icon: 'compass',
    art: 'plan-card__art--free',
    desc: 'Get started and explore CareerOS at no cost. Good for testing the workflow before you commit.',
    amount: '₹0',
    period: '/ forever',
    strike: null,
    save: null,
    features: [
      '5 auto-applications per month',
      'Basic resume parsing & ATS score',
      'Manual review before every submission',
      'Community support',
    ],
    payable: false,
  },
  starter: {
    name: 'Starter',
    badge: 'Most picked',
    icon: 'zap',
    art: 'plan-card__art--starter',
    desc: 'For active job seekers who apply every week and want the bot doing the heavy lifting.',
    amount: '₹49',
    period: '/ month',
    strike: '₹199',
    save: 'Save 75%',
    features: [
      'Unlimited auto-applications',
      'Gmail reply tracking',
      'Priority job board scanning',
      'Email support',
    ],
    payable: true,
    amountPaise: 4900,
  },
  pro: {
    name: 'Pro',
    badge: 'Best value',
    icon: 'rocket',
    art: 'plan-card__art--pro',
    desc: 'Unlimited applications, priority AI matching, and a full year of CareerOS at a locked-in rate.',
    amount: '₹399',
    period: '/ year',
    strike: '₹499',
    save: 'Save 20%',
    features: [
      'Everything in Starter',
      'Bring your own AI key (Groq, OpenAI, Claude)',
      'Priority AI job matching',
      'Priority support',
    ],
    payable: true,
    amountPaise: 39900,
  },
};

function render() {
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('plan') || 'free';
  const plan = PLANS[planId] || PLANS.free;

  const container = document.getElementById('plan-detail');

  const ctaHtml = plan.payable
    ? `<a class="btn btn-primary plan-detail__cta" href="payment.html?plan=${planId}">Pay now</a>`
    : `<a class="btn btn-primary plan-detail__cta" href="../login.html#signup">Get started free</a>`;

  container.innerHTML = `
    <div class="plan-detail__art ${plan.art}">
      <svg viewBox="0 0 400 160" class="plan-detail__pattern" preserveAspectRatio="xMidYMid slice">
        <circle cx="60" cy="30" r="90" fill="rgba(255,255,255,0.04)" />
        <circle cx="340" cy="140" r="110" fill="rgba(31,122,82,0.12)" />
      </svg>
      <span class="plan-detail__icon">${icon(plan.icon, 48)}</span>
    </div>
    <div class="plan-detail__body">
      <div class="plan-detail__title-row">
        <h1>${plan.name}</h1>
        ${plan.badge ? `<span class="plan-detail__badge">${plan.badge}</span>` : ''}
      </div>
      <p class="plan-detail__desc">${plan.desc}</p>
      <div class="plan-detail__price-row">
        <span class="plan-detail__amount">${plan.amount}</span>
        <span class="plan-detail__period">${plan.period}</span>
        ${plan.strike ? `<span class="plan-detail__strike">${plan.strike}</span>` : ''}
        ${plan.save ? `<span class="plan-detail__save">${plan.save}</span>` : ''}
      </div>
      <div class="plan-detail__features">
        ${plan.features.map((f) => `
          <div class="plan-detail__feature">
            ${icon('check', 18)}
            <span>${f}</span>
          </div>
        `).join('')}
      </div>
      ${ctaHtml}
    </div>
  `;

  document.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, 22);
  });
}

render();
