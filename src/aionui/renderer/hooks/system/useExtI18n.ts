/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extensions as extensionsIpc, type IExtensionSettingsTab } from '@/common/adapter/ipcBridge';

type NestedRecord = Record<string, unknown>;

/**
 * Deeply resolve a dot-separated key path from a nested object.
 * e.g. resolve('settingsTabs.star-office.name', { settingsTabs: { 'star-office': { name: '星辰办公' } } })
 */
function deepGet(obj: unknown, keyPath: string): string | undefined {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as NestedRecord)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Hook that provides a resolver function for extension settings tab names
 * with i18n support. Fetches extension i18n data for the current locale
 * and looks up `settingsTabs.{tabId}.name` in the extension's namespace.
 *
 * Falls back to `tab.label` when no translation is found.
 */
function getLocalSettingsTabId(tab: IExtensionSettingsTab): string {
  const globalPrefix = `ext-${tab.extensionName}-`;
  return tab.id.startsWith(globalPrefix) ? tab.id.slice(globalPrefix.length) : tab.id;
}

let cachedLocale = '';
let cachedExtI18nData: Record<string, unknown> | null = null;
let inflightLocalePromise: Promise<Record<string, unknown>> | null = null;
const extI18nSubscribers = new Set<(data: Record<string, unknown>) => void>();

function publishExtI18n(data: Record<string, unknown>, locale: string) {
  cachedLocale = locale;
  cachedExtI18nData = data;
  extI18nSubscribers.forEach((listener) => listener(data));
}

function loadExtI18n(locale: string): Promise<Record<string, unknown>> {
  if (cachedExtI18nData && cachedLocale === locale) {
    return Promise.resolve(cachedExtI18nData);
  }

  if (inflightLocalePromise) {
    return inflightLocalePromise;
  }

  inflightLocalePromise = extensionsIpc.getExtI18nForLocale
    .invoke({ locale })
    .then((data) => {
      const next = data ?? {};
      publishExtI18n(next, locale);
      return next;
    })
    .catch((err) => {
      console.error('[useExtI18n] Failed to load ext i18n:', err);
      return cachedLocale === locale && cachedExtI18nData ? cachedExtI18nData : {};
    })
    .finally(() => {
      inflightLocalePromise = null;
    });

  return inflightLocalePromise;
}

export function useExtI18n(): {
  resolveExtTabName: (tab: IExtensionSettingsTab) => string;
} {
  const { i18n } = useTranslation();
  const [extI18nData, setExtI18nData] = useState<Record<string, unknown>>(() =>
    cachedLocale === i18n.language && cachedExtI18nData ? cachedExtI18nData : {}
  );

  useEffect(() => {
    const locale = i18n.language;
    extI18nSubscribers.add(setExtI18nData);

    if (cachedLocale === locale && cachedExtI18nData) {
      setExtI18nData(cachedExtI18nData);
    } else {
      void loadExtI18n(locale).then((data) => {
        setExtI18nData(data);
      });
    }

    return () => {
      extI18nSubscribers.delete(setExtI18nData);
    };
  }, [i18n.language]);

  const resolveExtTabName = useCallback(
    (tab: IExtensionSettingsTab): string => {
      const nsData = extI18nData[tab.extensionName] as NestedRecord | undefined;
      const localTabId = getLocalSettingsTabId(tab);
      if (nsData) {
        const translated =
          deepGet(nsData, `extension.settingsTabs.${localTabId}.name`) ?? deepGet(nsData, `settings.tab.${localTabId}`);
        if (translated) return translated;
      }
      return tab.label;
    },
    [extI18nData]
  );

  return { resolveExtTabName };
}
