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
      
      const validationResult = this.validateProfile(profile);
      if (!validationResult.isValid) {
        throw new Error(`${CONSTANTS.ERRORS.INVALID_PROFILE}: ${validationResult.error}`);
      }
      
      return profile;
    } catch (error) {
      console.error('Error loading profile:', error);
      throw error;
    }
  }

  private validateProfile(profile: UserProfile): { isValid: boolean; error?: string } {
    // Check basic required fields
    if (!profile) return { isValid: false, error: 'Profile is undefined' };
    if (!profile.name) return { isValid: false, error: 'Name is required' };
    if (!profile.summary) return { isValid: false, error: 'Summary is required' };

    // Validate letter preferences
    if (!profile.letter_preferences) {
      return { isValid: false, error: 'Letter preferences are required' };
    }
    
    const { letter_preferences } = profile;
    if (!letter_preferences.greeting) {
      return { isValid: false, error: 'Letter greeting is required' };
    }
    if (!letter_preferences.structure?.length) {
      return { isValid: false, error: 'Letter structure length is required' };
    }
    if (!letter_preferences.closing?.gratitude || !letter_preferences.closing?.signature) {
      return { isValid: false, error: 'Letter closing (gratitude and signature) are required' };
    }

    // Validate contact information
    if (!profile.contact) {
      return { isValid: false, error: 'Contact information is required' };
    }
    
    const { contact } = profile;
    if (!contact.email) {
      return { isValid: false, error: 'Email is required in contact information' };
    }
    if (!contact.location) {
      return { isValid: false, error: 'Location is required in contact information' };
    }
    if (!contact.linkedin) {
      return { isValid: false, error: 'LinkedIn URL is required in contact information' };
    }

    // Validate experience
    if (!Array.isArray(profile.experience)) {
      return { isValid: false, error: 'Experience must be an array' };
    }
    if (profile.experience.length === 0) {
      return { isValid: false, error: 'At least one experience entry is required' };
    }

    for (const [index, exp] of profile.experience.entries()) {
      if (!exp.company) {
        return { isValid: false, error: `Experience ${index + 1} is missing company name` };
      }
      if (!exp.role) {
        return { isValid: false, error: `Experience ${index + 1} is missing role` };
      }
      if (!Array.isArray(exp.highlights) || exp.highlights.length === 0) {
        return { isValid: false, error: `Experience ${index + 1} must have at least one highlight` };
      }
      if (!Array.isArray(exp.technologies) || exp.technologies.length === 0) {
        return { isValid: false, error: `Experience ${index + 1} must have at least one technology` };
      }
    }

    // Validate skills
    if (!profile.skills?.core || !profile.skills?.soft) {
      return { isValid: false, error: 'Skills must include both core and soft skills' };
    }

    const { core } = profile.skills;
    if (!core.languages?.length) {
      return { isValid: false, error: 'At least one programming language is required' };
    }
    if (!core.frontend?.length || !core.backend?.length) {
      return { isValid: false, error: 'Both frontend and backend skills are required' };
    }

    if (!Array.isArray(profile.skills.soft) || profile.skills.soft.length === 0) {
      return { isValid: false, error: 'At least one soft skill is required' };
    }

    // All validations passed
    return { isValid: true };
  }
}