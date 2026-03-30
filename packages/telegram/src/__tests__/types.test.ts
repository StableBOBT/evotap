import { describe, it, expect } from 'vitest';
import {
  toTelegramUser,
  toValidatedUser,
  type RawTelegramUser,
  type TelegramUser,
} from '../types.js';

describe('Telegram Types', () => {
  describe('toTelegramUser', () => {
    it('should convert raw user with all fields', () => {
      const raw: RawTelegramUser = {
        id: 123456789,
        first_name: 'Juan',
        last_name: 'Pérez',
        username: 'juanperez',
        language_code: 'es',
        is_premium: true,
        photo_url: 'https://example.com/photo.jpg',
        allows_write_to_pm: true,
      };

      const result = toTelegramUser(raw);

      expect(result.id).toBe(123456789);
      expect(result.firstName).toBe('Juan');
      expect(result.lastName).toBe('Pérez');
      expect(result.username).toBe('juanperez');
      expect(result.languageCode).toBe('es');
      expect(result.isPremium).toBe(true);
      expect(result.photoUrl).toBe('https://example.com/photo.jpg');
      expect(result.allowsWriteToPm).toBe(true);
    });

    it('should convert raw user with minimal fields', () => {
      const raw: RawTelegramUser = {
        id: 123456789,
        first_name: 'Juan',
      };

      const result = toTelegramUser(raw);

      expect(result.id).toBe(123456789);
      expect(result.firstName).toBe('Juan');
      expect(result.lastName).toBeUndefined();
      expect(result.username).toBeUndefined();
      expect(result.languageCode).toBeUndefined();
      expect(result.isPremium).toBeUndefined();
    });
  });

  describe('toValidatedUser', () => {
    it('should convert TelegramUser to ValidatedUser', () => {
      const user: TelegramUser = {
        id: 123456789,
        firstName: 'María',
        lastName: 'García',
        username: 'mariagarcia',
        languageCode: 'es',
        isPremium: true,
      };

      const result = toValidatedUser(user);

      expect(result.id).toBe(123456789);
      expect(result.firstName).toBe('María');
      expect(result.lastName).toBe('García');
      expect(result.username).toBe('mariagarcia');
      expect(result.languageCode).toBe('es');
      expect(result.isPremium).toBe(true);
    });

    it('should default isPremium to false', () => {
      const user: TelegramUser = {
        id: 123456789,
        firstName: 'Test',
      };

      const result = toValidatedUser(user);

      expect(result.isPremium).toBe(false);
    });
  });
});
