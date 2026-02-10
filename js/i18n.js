/* ========================
   i18n - Internationalization Module
   ======================== */

class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'zh', 'hi', 'ru', 'ja', 'es', 'pt', 'id', 'tr', 'de', 'fr'];
        this.currentLang = this.detectLanguage();
        this.languageNames = {
            ko: '한국어',
            en: 'English',
            zh: '中文',
            hi: 'हिन्दी',
            ru: 'Русский',
            ja: '日本語',
            es: 'Español',
            pt: 'Português',
            id: 'Bahasa Indonesia',
            tr: 'Türkçe',
            de: 'Deutsch',
            fr: 'Français'
        };
    }

    detectLanguage() {
        // Try localStorage first
        const saved = localStorage.getItem('preferredLanguage');
        if (saved && this.supportedLanguages.includes(saved)) {
            return saved;
        }

        // Try browser language
        const browserLang = navigator.language?.split('-')[0];
        if (browserLang && this.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }

        // Default to Korean
        return 'ko';
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`./js/locales/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang}`);
            this.translations[lang] = await response.json();
            return true;
        } catch (error) {
            console.error('Translation loading error:', error);
            return false;
        }
    }

    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (!value) return key;
            value = value[k];
        }

        return value || key;
    }

    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Language ${lang} not supported`);
            return false;
        }

        if (!this.translations[lang]) {
            const loaded = await this.loadTranslations(lang);
            if (!loaded) return false;
        }

        this.currentLang = lang;
        localStorage.setItem('preferredLanguage', lang);
        this.updateUI();
        return true;
    }

    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder) {
                    el.setAttribute('placeholder', text);
                }
            } else {
                el.textContent = text;
            }
        });
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getLanguageName(lang) {
        return this.languageNames[lang] || lang;
    }

    getSupportedLanguages() {
        return this.supportedLanguages;
    }
}

// Initialize i18n
const i18n = new I18n();

// Auto-initialize on document ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await i18n.loadTranslations(i18n.currentLang);
        i18n.updateUI();
    } catch (e) {
        console.warn('i18n init failed:', e);
    }
});
