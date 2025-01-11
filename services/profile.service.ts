import { readFile } from 'fs/promises';
import { injectable } from 'tsyringe';
import type { UserProfile } from '../types';
import { CONSTANTS } from '../config/constants';

@injectable()
export class ProfileService {
  async loadProfile(): Promise<UserProfile> {
    try {
      const data = await readFile('./profile.json', 'utf-8');
      const profile: UserProfile = JSON.parse(data);
      
      if (!this.validateProfile(profile)) {
        throw new Error(CONSTANTS.ERRORS.INVALID_PROFILE);
      }
      
      return profile;
    } catch (error) {
      console.error('Error loading profile:', error);
      throw error;
    }
  }

  private validateProfile(profile: UserProfile): boolean {
    return !!(profile.name && profile.title && profile.summary);
  }
}