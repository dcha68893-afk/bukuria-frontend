/**
 * Simple i18n (multi-language) module.
 * Usage in HTML:  <span data-i18n="home.welcome"></span>
 * Call i18n.setLanguage('sw') to switch to Swahili.
 */
const i18n = (() => {
  const translations = {
    en: {
      'nav.home': 'Home', 'nav.about': 'About', 'nav.ministries': 'Ministries',
      'nav.sermons': 'Sermons', 'nav.live': 'Live', 'nav.events': 'Events',
      'nav.devotionals': 'Devotionals', 'nav.bible': 'Bible', 'nav.gallery': 'Gallery',
      'nav.prayer': 'Prayer', 'nav.give': 'Give', 'nav.contact': 'Contact',
      'home.welcome': 'Welcome to Gwikonge PEFA Church',
      'home.tagline': 'Proclaiming Christ · Making Disciples · Transforming Lives',
      'home.watchLive': '🔴 Watch Live', 'home.give': '💛 Give', 'home.join': '✝ Join Us',
      'home.services': 'Sunday Services: 9:00 AM & 11:00 AM | Wednesday Bible Study: 6:00 PM | Friday Youth: 5:00 PM',
      'home.upcomingEvents': 'Upcoming Events', 'home.announcements': 'Latest Announcements',
      'prayer.title': 'Prayer Requests', 'prayer.submit': 'Submit Prayer Request',
      'give.title': 'Give', 'contact.title': 'Contact Us',
      'auth.login': 'Login', 'auth.register': 'Join Us', 'auth.logout': 'Logout',
      'btn.readMore': 'Read More', 'btn.download': 'Download', 'btn.watch': 'Watch',
      'btn.listen': 'Listen', 'btn.register': 'Register', 'btn.submit': 'Submit',
      'footer.rights': 'All rights reserved.',
    },
    sw: { // Kiswahili
      'nav.home': 'Nyumbani', 'nav.about': 'Kuhusu', 'nav.ministries': 'Huduma',
      'nav.sermons': 'Mahubiri', 'nav.live': 'Moja kwa Moja', 'nav.events': 'Matukio',
      'nav.devotionals': 'Ibada za Kila Siku', 'nav.bible': 'Biblia', 'nav.gallery': 'Picha',
      'nav.prayer': 'Maombi', 'nav.give': 'Toa', 'nav.contact': 'Wasiliana',
      'home.welcome': 'Karibu Kanisa la Gwikonge PEFA',
      'home.tagline': 'Kutangaza Kristo · Kufanya Wanafunzi · Kubadilisha Maisha',
      'home.watchLive': '🔴 Angalia Moja kwa Moja', 'home.give': '💛 Toa Sadaka', 'home.join': '✝ Jiunge Nasi',
      'home.services': 'Huduma ya Jumapili: 9:00 AM na 11:00 AM | Masomo ya Biblia Jumatano: 6:00 PM | Ijumaa Vijana: 5:00 PM',
      'home.upcomingEvents': 'Matukio Yajayo', 'home.announcements': 'Matangazo ya Hivi Karibuni',
      'prayer.title': 'Maombi', 'prayer.submit': 'Wasilisha Ombi la Maombi',
      'give.title': 'Toa Sadaka', 'contact.title': 'Wasiliana Nasi',
      'auth.login': 'Ingia', 'auth.register': 'Jiunge', 'auth.logout': 'Toka',
      'btn.readMore': 'Soma Zaidi', 'btn.download': 'Pakua', 'btn.watch': 'Angalia',
      'btn.listen': 'Sikiliza', 'btn.register': 'Jisajili', 'btn.submit': 'Wasilisha',
      'footer.rights': 'Haki zote zimehifadhiwa.',
    },
  };

  let currentLang = localStorage.getItem('pefa_lang') || 'en';

  function t(key) {
    return (translations[currentLang] && translations[currentLang][key])
      || translations['en'][key]
      || key;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPh);
    });
  }

  function setLanguage(lang) {
    if (!translations[lang]) { console.warn(`Language "${lang}" not available`); return; }
    currentLang = lang;
    localStorage.setItem('pefa_lang', lang);
    applyTranslations();
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    document.documentElement.lang = lang;
  }

  function getLanguage() { return currentLang; }

  // Auto-apply on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslations);
  } else {
    applyTranslations();
  }

  return { t, setLanguage, getLanguage, applyTranslations };
})();
