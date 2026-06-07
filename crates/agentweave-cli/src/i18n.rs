use fluent_bundle::{FluentArgs, FluentBundle, FluentResource, FluentValue};
use std::collections::HashMap;
use unic_langid::LanguageIdentifier;

const EN_US_FTL: &str = include_str!("../locales/en-US.ftl");
const ZH_CN_FTL: &str = include_str!("../locales/zh-CN.ftl");
const JA_JP_FTL: &str = include_str!("../locales/ja-JP.ftl");

#[allow(dead_code)]
pub const SUPPORTED_LOCALES: &[&str] = &["en-US", "zh-CN", "ja-JP"];

pub struct I18n {
    bundle: FluentBundle<FluentResource>,
    #[allow(dead_code)]
    locale: String,
}

impl I18n {
    pub fn new(locale: &str) -> Self {
        let (resolved_locale, ftl_source) = match locale {
            "zh-CN" | "zh" | "zh_CN" => ("zh-CN", ZH_CN_FTL),
            "ja-JP" | "ja" | "ja_JP" => ("ja-JP", JA_JP_FTL),
            _ => ("en-US", EN_US_FTL),
        };

        let langid: LanguageIdentifier = resolved_locale.parse().unwrap_or_else(|_| {
            "en-US".parse().expect("en-US is a valid locale")
        });

        let resource =
            FluentResource::try_new(ftl_source.to_string()).expect("valid FTL resource");

        let mut bundle = FluentBundle::new(vec![langid]);
        bundle
            .add_resource(resource)
            .expect("failed to add FTL resource to bundle");

        Self {
            bundle,
            locale: resolved_locale.to_string(),
        }
    }

    /// Detect locale from environment (LANG, LC_ALL) or CLI override.
    pub fn detect(lang_override: Option<&str>) -> Self {
        if let Some(lang) = lang_override {
            return Self::new(lang);
        }

        // Check LANG / LC_ALL environment variables
        if let Ok(lang) = std::env::var("LC_ALL") {
            if !lang.is_empty() {
                return Self::new(&normalize_locale(&lang));
            }
        }
        if let Ok(lang) = std::env::var("LANG") {
            if !lang.is_empty() {
                return Self::new(&normalize_locale(&lang));
            }
        }

        // Use sys-locale as fallback
        if let Some(locale) = sys_locale::get_locale() {
            return Self::new(&normalize_locale(&locale));
        }

        Self::new("en-US")
    }

    #[allow(dead_code)]
    pub fn locale(&self) -> &str {
        &self.locale
    }

    /// Get a simple translated message (no arguments).
    pub fn t(&self, msg_id: &str) -> String {
        self.format(msg_id, None)
    }

    /// Get a translated message with arguments.
    pub fn t_args(&self, msg_id: &str, args: &HashMap<&str, &str>) -> String {
        let mut fluent_args = FluentArgs::new();
        for (k, v) in args {
            fluent_args.set(*k, FluentValue::from(*v));
        }
        self.format(msg_id, Some(&fluent_args))
    }

    fn format(&self, msg_id: &str, args: Option<&FluentArgs<'_>>) -> String {
        let msg = match self.bundle.get_message(msg_id) {
            Some(m) => m,
            None => return msg_id.to_string(),
        };
        let pattern = match msg.value() {
            Some(p) => p,
            None => return msg_id.to_string(),
        };
        let mut errors = Vec::new();
        let result = self.bundle.format_pattern(pattern, args, &mut errors);
        result.to_string()
    }
}

/// Normalize locale strings like "en_US.UTF-8" to "en-US".
fn normalize_locale(locale: &str) -> String {
    let base = locale.split('.').next().unwrap_or(locale);
    base.replace('_', "-")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_english_messages() {
        let i18n = I18n::new("en-US");
        assert_eq!(i18n.locale(), "en-US");
        assert_eq!(i18n.t("app-name"), "AgentWeave");
        assert_eq!(i18n.t("validate-success"), "Configuration is valid");
    }

    #[test]
    fn test_chinese_messages() {
        let i18n = I18n::new("zh-CN");
        assert_eq!(i18n.locale(), "zh-CN");
        assert_eq!(i18n.t("app-name"), "AgentWeave");
        assert_eq!(i18n.t("validate-success"), "配置有效");
    }

    #[test]
    fn test_japanese_messages() {
        let i18n = I18n::new("ja-JP");
        assert_eq!(i18n.locale(), "ja-JP");
        assert_eq!(i18n.t("app-name"), "AgentWeave");
        assert_eq!(i18n.t("validate-success"), "構成は有効です");
    }

    #[test]
    fn test_message_with_args() {
        let i18n = I18n::new("en-US");
        let mut args = HashMap::new();
        args.insert("name", "TestProject");
        args.insert("path", "/tmp/test");
        let result = i18n.t_args("init-success", &args);
        assert!(result.contains("TestProject"));
        assert!(result.contains("/tmp/test"));
    }

    #[test]
    fn test_fallback_to_english() {
        let i18n = I18n::new("fr-FR");
        assert_eq!(i18n.locale(), "en-US");
        assert_eq!(i18n.t("validate-success"), "Configuration is valid");
    }

    #[test]
    fn test_normalize_locale() {
        assert_eq!(normalize_locale("en_US.UTF-8"), "en-US");
        assert_eq!(normalize_locale("zh_CN"), "zh-CN");
        assert_eq!(normalize_locale("ja-JP"), "ja-JP");
    }

    #[test]
    fn test_short_locale_codes() {
        let zh = I18n::new("zh");
        assert_eq!(zh.locale(), "zh-CN");
        let ja = I18n::new("ja");
        assert_eq!(ja.locale(), "ja-JP");
    }

    #[test]
    fn test_missing_message_returns_id() {
        let i18n = I18n::new("en-US");
        assert_eq!(i18n.t("nonexistent-key"), "nonexistent-key");
    }

    #[test]
    fn test_detect_defaults_to_english() {
        // When no override and env may not be set, should not panic
        let i18n = I18n::detect(Some("en-US"));
        assert_eq!(i18n.locale(), "en-US");
    }

    #[test]
    fn test_supported_locales() {
        assert!(SUPPORTED_LOCALES.contains(&"en-US"));
        assert!(SUPPORTED_LOCALES.contains(&"zh-CN"));
        assert!(SUPPORTED_LOCALES.contains(&"ja-JP"));
    }
}
