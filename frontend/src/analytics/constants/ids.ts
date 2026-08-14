/**
 * frontend/src/analytics/constants/ids.ts
 *
 * ANALYTICS_IDS Registry — canonical unique ID dictionary for interactive elements.
 * Convention: <surface>.<area>.<component>.<element>[.<variant>]
 */

export const ANALYTICS_IDS = {
  global: {
    sidebar: {
      link: { item: 'sa.global.sidebar.link.item' },
      icon: { collapse: 'sa.global.sidebar.icon.collapse' },
    },
    topbar: {
      menu: {
        profile: 'sa.global.topbar.menu.profile',
        roleSwitch: 'sa.global.topbar.menu.role-switch',
      },
      icon: { notifications: 'sa.global.topbar.icon.notifications' },
      input: { search: 'sa.global.topbar.input.search' },
      toggle: { theme: 'sa.global.topbar.toggle.theme' },
    },
    notifications: {
      row: { item: 'sa.global.notifications.row.item' },
    },
    tabbar: {
      tab: { item: 'sa.global.tabbar.tab.item' },
    },
    toast: {
      btn: { action: 'sa.global.toast.btn.action' },
    },
    modal: {
      icon: { close: 'sa.global.modal.icon.close' },
    },
  },
  marketing: {
    home: {
      banner: { promo: 'sa.marketing.home.banner.promo' },
      icon: { carouselNext: 'sa.marketing.home.icon.carousel-next' },
      btn: { heroCta: 'sa.marketing.home.btn.hero-cta' },
    },
    checkout: {
      btn: {
        couponApply: 'sa.marketing.checkout.btn.coupon-apply',
        couponRemove: 'sa.marketing.checkout.btn.coupon-remove',
      },
    },
    pricing: {
      card: { plan: 'sa.marketing.pricing.card.plan' },
    },
  },
  echo: {
    list: {
      card: { event: 'sa.echo.list.card.event' },
    },
    detail: {
      btn: {
        viewDetails: 'sa.echo.detail.btn.view-details',
        addCalendar: 'sa.echo.detail.btn.add-calendar',
      },
      icon: { share: 'sa.echo.detail.icon.share' },
    },
    register: {
      btn: {
        start: 'sa.echo.register.btn.start',
        submit: 'sa.echo.register.btn.submit',
      },
      chip: { teamSize: 'sa.echo.register.chip.team-size' },
      card: { track: 'sa.echo.register.card.track' },
    },
    payment: {
      chip: { method: 'sa.echo.payment.chip.method' },
    },
    leaderboard: {
      row: { team: 'sa.echo.leaderboard.row.team' },
    },
  },
  verify: {
    form: {
      btn: { submit: 'sa.verify.form.btn.submit' },
      input: { certId: 'sa.verify.form.input.cert-id' },
    },
  },
  profile: {
    btn: {
      shareMemberId: 'sa.profile.btn.share-member-id',
      certDownload: 'sa.profile.btn.cert-download',
    },
    card: {
      certificate: 'sa.profile.card.certificate',
    },
  },
  agentk: {
    sidebar: {
      btn: { newChat: 'sa.agentk.sidebar.btn.new-chat' },
    },
    composer: {
      btn: {
        send: 'sa.agentk.composer.btn.send',
        stop: 'sa.agentk.composer.btn.stop',
      },
      icon: { attach: 'sa.agentk.composer.icon.attach' },
      menu: { model: 'sa.agentk.composer.menu.model' },
    },
    settings: {
      btn: { byokSubmit: 'sa.agentk.settings.btn.byok-submit' },
    },
    message: {
      icon: {
        copy: 'sa.agentk.message.icon.copy',
        feedback: 'sa.agentk.message.icon.feedback',
      },
      btn: { regenerate: 'sa.agentk.message.btn.regenerate' },
    },
    empty: {
      chip: { suggestion: 'sa.agentk.empty.chip.suggestion' },
    },
  },
  network: {
    card: {
      btn: { connect: 'sa.network.card.btn.connect' },
      icon: { message: 'sa.network.card.icon.message' },
    },
    list: {
      card: { person: 'sa.network.list.card.person' },
    },
    requests: {
      btn: { accept: 'sa.network.requests.btn.accept' },
    },
  },
  mentor: {
    profile: {
      btn: { bookSession: 'sa.mentor.profile.btn.book-session' },
    },
    booking: {
      btn: { confirm: 'sa.mentor.booking.btn.confirm' },
    },
    list: {
      card: { profile: 'sa.mentor.list.card.profile' },
    },
    calendar: {
      slot: { select: 'sa.mentor.calendar.slot.select' },
    },
  },
  jobs: {
    detail: {
      btn: { apply: 'sa.jobs.detail.btn.apply' },
    },
    list: {
      card: { job: 'sa.jobs.list.card.job' },
      btn: { loadMore: 'sa.jobs.list.btn.load-more' },
    },
    card: {
      icon: { save: 'sa.jobs.card.icon.save' },
    },
    filters: {
      btn: { apply: 'sa.jobs.filters.btn.apply' },
    },
  },
  auth: {
    login: {
      btn: {
        submit: 'sa.auth.login.btn.submit',
        sso: 'sa.auth.login.btn.sso',
      },
    },
    signup: {
      btn: { submit: 'sa.auth.signup.btn.submit' },
    },
  },
  onboarding: {
    role: {
      card: { select: 'sa.onboarding.role.card.select' },
    },
    campus: {
      input: { select: 'sa.onboarding.campus.input.select' },
    },
    step: {
      btn: { skip: 'sa.onboarding.step.btn.skip' },
    },
    complete: {
      btn: { finish: 'sa.onboarding.complete.btn.finish' },
    },
    profile: {
      btn: { resumeUpload: 'sa.onboarding.profile.btn.resume-upload' },
    },
  },
} as const;
