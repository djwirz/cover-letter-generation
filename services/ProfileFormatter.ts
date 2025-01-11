import { injectable } from 'tsyringe';
import { ExperienceWithRelevance, UserProfile } from '../types';

@injectable()
export class ProfileFormatter {
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\W+/);
    const stopWords = new Set(['and', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with']);
    return [...new Set(words.filter(word => 
      word.length > 2 && !stopWords.has(word)
    ))];
  }

  private findRelevantExperience(profile: UserProfile, jobDescription: string): ExperienceWithRelevance[] {
    const jobKeywords = this.extractKeywords(jobDescription);
    
    return profile.experience.map(exp => {
      const expText = [
        ...exp.highlights,
        ...exp.technologies,
        exp.role
      ].join(' ');
      
      const expKeywords = this.extractKeywords(expText);
      const matchingKeywords = expKeywords.filter(keyword => 
        jobKeywords.includes(keyword)
      );
      
      return {
        ...exp,
        relevance: matchingKeywords.length
      };
    })
    .sort((a, b) => b.relevance - a.relevance);
  }

  private findRelevantAchievements(profile: UserProfile, jobDescription: string): string[] {
    const jobKeywords = this.extractKeywords(jobDescription);
    
    // Safely collect all achievements, handling optional fields
    const allAchievements = [
      ...(profile.achievements || []),
      ...(profile.achievements_by_category?.technical || []),
      ...(profile.achievements_by_category?.leadership || []),
      ...(profile.achievements_by_category?.collaboration || []),
      ...(profile.achievements_by_category?.innovation || [])
    ];

    // If no achievements are found, return empty array
    if (allAchievements.length === 0) {
      return [];
    }

    return allAchievements
      .map(achievement => ({
        text: achievement,
        relevance: this.extractKeywords(achievement)
          .filter(keyword => jobKeywords.includes(keyword)).length
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 4)
      .map(a => a.text);
  }

  formatForAI(profile: UserProfile, jobDescription: string): string {
    const relevantExperience = this.findRelevantExperience(profile, jobDescription);

    const formattedProfile = {
      basics: {
        name: profile.name,
        preferred_name: profile.preferred_name,
        title: profile.title,
        summary: profile.summary,
        contact: profile.contact
      },
      relevantExperience: relevantExperience.slice(0, 2),
      keySkills: {
        technical: profile.skills.core,
        soft: profile.skills.soft
      },
      topAchievements: this.findRelevantAchievements(profile, jobDescription),
      preferences: profile.letter_preferences
    };

    return `
Role: You are a professional cover letter writer helping a software engineer apply for a position.

Profile Information:
${JSON.stringify(formattedProfile, null, 2)}

Job Description:
${jobDescription}

Instructions:
1. Create a cover letter following these specifications:
- Use greeting: "${profile.letter_preferences.greeting}"
- Write ${profile.letter_preferences.structure.length} paragraphs
- End with: "${profile.letter_preferences.closing.gratitude}"
- Sign as: "${profile.letter_preferences.closing.signature}"

2. Focus on matching the candidate's experience with the job requirements
3. Highlight specific achievements that demonstrate relevant capabilities
4. Maintain a professional but personalized tone
5. Emphasize experience with similar technologies and domains
6. Focus on concrete examples and measurable impacts
`;
  }

  formatForClaude(profile: UserProfile, jobDescription: string): string {
    return this.formatForAI(profile, jobDescription);
  }

  formatForOpenAI(profile: UserProfile, jobDescription: string): string {
    return this.formatForAI(profile, jobDescription);
  }
}