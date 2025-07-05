/**
 * Template loader utility for OAuth HTML templates
 * 
 * This utility provides functions to load and process HTML templates
 * with variable substitution for OAuth authentication pages.
 */

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Template variables interface
 */
interface TemplateVariables {
  [key: string]: string | number;
}

/**
 * Success page template variables
 */
interface SuccessTemplateVariables extends TemplateVariables {
  autoCloseSeconds: number;
  autoCloseDelay: number;
}

/**
 * Error page template variables
 */
interface ErrorTemplateVariables extends TemplateVariables {
  title: string;
  message: string;
}

/**
 * Template loader class for OAuth HTML templates
 */
export class TemplateLoader {
  private templateCache = new Map<string, string>();
  private templatesDir: string;

  constructor() {
    this.templatesDir = join(__dirname);
  }

  /**
   * Load and process a template with variable substitution
   * @param templateName - Name of the template file (without .html extension)
   * @param variables - Variables to substitute in the template
   * @returns Promise resolving to processed HTML string
   */
  async loadTemplate(templateName: string, variables: TemplateVariables = {}): Promise<string> {
    try {
      // Load template content
      let template = await this.getTemplateContent(templateName);
      
      // Perform variable substitution
      template = this.substituteVariables(template, variables);
      
      return template;
    } catch (error) {
      throw new Error(`Failed to load template '${templateName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load success page template with auto-close functionality
   * @param autoCloseDelay - Auto-close delay in milliseconds (default: 3000)
   * @returns Promise resolving to processed HTML string
   */
  async loadSuccessTemplate(autoCloseDelay: number = 3000): Promise<string> {
    const variables: SuccessTemplateVariables = {
      autoCloseSeconds: Math.ceil(autoCloseDelay / 1000),
      autoCloseDelay
    };

    return this.loadTemplate('success', variables);
  }

  /**
   * Load error page template with custom title and message
   * @param title - Error title
   * @param message - Error message
   * @returns Promise resolving to processed HTML string
   */
  async loadErrorTemplate(title: string, message: string): Promise<string> {
    const variables: ErrorTemplateVariables = {
      title: this.escapeHtml(title),
      message: this.escapeHtml(message)
    };

    return this.loadTemplate('error', variables);
  }

  /**
   * Get template content from file or cache
   * @param templateName - Name of the template file
   * @returns Promise resolving to template content
   */
  private async getTemplateContent(templateName: string): Promise<string> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Load from file
    const templatePath = join(this.templatesDir, `${templateName}.html`);
    const content = await fs.readFile(templatePath, 'utf-8');
    
    // Cache the content
    this.templateCache.set(templateName, content);
    
    return content;
  }

  /**
   * Substitute variables in template content
   * @param template - Template content with {{variable}} placeholders
   * @param variables - Variables to substitute
   * @returns Template with variables substituted
   */
  private substituteVariables(template: string, variables: TemplateVariables): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, String(value));
    }
    
    // Check for any remaining unsubstituted placeholders and provide defaults
    const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
    if (remainingPlaceholders) {
      console.warn('Template has unsubstituted placeholders:', remainingPlaceholders);
      
      // Provide safe defaults for common placeholders
      result = result.replace(/\{\{autoCloseSeconds\}\}/g, '3');
      result = result.replace(/\{\{autoCloseDelay\}\}/g, '3000');
      result = result.replace(/\{\{title\}\}/g, 'Error');
      result = result.replace(/\{\{message\}\}/g, 'An error occurred');
    }
    
    return result;
  }

  /**
   * Clear template cache (useful for testing or development)
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Get fallback inline HTML for critical errors when templates can't be loaded
   * @param title - Error title
   * @param message - Error message
   * @returns Basic HTML error page
   */
  getFallbackErrorHtml(title: string, message: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Error</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #d32f2f; }
    </style>
</head>
<body>
    <h1 class="error">${this.escapeHtml(title)}</h1>
    <p>${this.escapeHtml(message)}</p>
    <p><small>Please close this window and try again.</small></p>
</body>
</html>`;
  }

  /**
   * Get fallback inline HTML for success when templates can't be loaded
   * @returns Basic HTML success page
   */
  getFallbackSuccessHtml(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Successful</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: #2e7d32; }
    </style>
</head>
<body>
    <h1 class="success">Authentication Successful!</h1>
    <p>You have successfully authenticated with Google Calendar.</p>
    <p><small>You can close this window now.</small></p>
</body>
</html>`;
  }

  /**
   * Escape HTML to prevent XSS in fallback templates
   * @param text - Text to escape
   * @returns HTML-escaped text
   */
  private escapeHtml(text: string): string {
    const div = { innerHTML: '' } as any;
    div.textContent = text;
    return div.innerHTML || text.replace(/[&<>"']/g, (match: string) => {
      const escapeMap: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escapeMap[match];
    });
  }
}

/**
 * Global template loader instance
 */
export const templateLoader = new TemplateLoader();
