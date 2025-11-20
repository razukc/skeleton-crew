import * as readline from 'readline';
import { UIProvider, ScreenDefinition, RuntimeContext } from '../../src/types.js';
import { getCounterValue } from '../plugins/counter.js';
import { getAllSettings } from '../plugins/settings.js';

/**
 * Terminal UI Provider
 * 
 * This class demonstrates how to implement a UI provider for Skeleton Crew Runtime.
 * UI providers are responsible for:
 * 1. Rendering screens in a specific UI technology (terminal, React, Vue, etc.)
 * 2. Handling user input and triggering actions
 * 3. Displaying events and state changes
 * 4. Managing UI lifecycle (mount/unmount)
 * 
 * The key insight: The runtime is UI-agnostic. This terminal implementation could
 * be swapped for a React, Vue, or any other UI implementation without changing
 * the plugins or core runtime code.
 * 
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */

interface EventLogEntry {
  event: string;
  data: unknown;
}

/**
 * Formatting helpers for visual output
 * These helpers create consistent, visually appealing terminal output
 * @see Requirements 7.1, 7.2, 7.3, 7.4
 */
class FormatHelper {
  /**
   * Create a formatted header with borders
   * @see Requirements 7.2
   */
  static header(text: string, width: number = 60): string {
    const padding = Math.max(0, width - text.length - 4);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    
    return [
      '╔' + '═'.repeat(width - 2) + '╗',
      '║' + ' '.repeat(leftPad) + text + ' '.repeat(rightPad) + '║',
      '╚' + '═'.repeat(width - 2) + '╝'
    ].join('\n');
  }

  /**
   * Create a simple separator line
   * @see Requirements 7.2
   */
  static separator(width: number = 60, char: string = '─'): string {
    return char.repeat(width);
  }

  /**
   * Create a section header with separator
   * @see Requirements 7.2
   */
  static sectionHeader(text: string, width: number = 60): string {
    return [
      '',
      '═'.repeat(width),
      `  ${text}`,
      '═'.repeat(width),
      ''
    ].join('\n');
  }

  /**
   * Format action menu items with letters
   * @see Requirements 7.3
   */
  static actionItem(key: string, label: string): string {
    return `  [${key}] ${label}`;
  }

  /**
   * Format numbered menu items
   * @see Requirements 7.3
   */
  static numberedItem(number: number, label: string, detail?: string): string {
    if (detail) {
      return `  ${number}. ${label} (${detail})`;
    }
    return `  ${number}. ${label}`;
  }

  /**
   * Format success confirmation message
   * @see Requirements 7.4
   */
  static success(message: string): string {
    return `\n✅ ${message}\n`;
  }

  /**
   * Format error message
   * @see Requirements 7.4
   */
  static error(message: string): string {
    return `\n❌ ${message}\n`;
  }

  /**
   * Format plugin initialization message
   * @see Requirements 7.1
   */
  static pluginInit(pluginName: string): string {
    return `  🔌 Plugin initialized: ${pluginName}`;
  }

  /**
   * Format event log entry
   * @see Requirements 7.5
   */
  static eventLog(eventName: string, data: unknown): string {
    return `  📡 ${eventName}: ${JSON.stringify(data)}`;
  }
}

/**
 * TerminalUIProvider class that implements the UIProvider interface
 * 
 * This class demonstrates the three required methods of a UI provider:
 * 1. mount() - Initialize the UI and start rendering
 * 2. renderScreen() - Render a specific screen
 * 3. unmount() - Cleanup and shutdown the UI
 * 
 * The UI provider has access to the RuntimeContext, which allows it to:
 * - Query registered screens
 * - Execute actions
 * - Subscribe to events
 * - Access plugin information
 */
export class TerminalUIProvider implements UIProvider {
  private currentScreen: string | null = null;
  private eventLog: EventLogEntry[] = [];
  private rl: readline.Interface | null = null;
  private context: RuntimeContext | null = null;

  /**
   * Mount the terminal UI provider
   * 
   * This is called once when the UI provider is registered with the runtime.
   * It initializes the terminal interface, displays welcome messages, and
   * shows the screen menu.
   * 
   * @param target - Mount target (unused in terminal, but would be a DOM element in React)
   * @param context - RuntimeContext provides access to all runtime subsystems
   * @see Requirements 8.1, 8.4, 7.1
   */
  async mount(target: unknown, context: RuntimeContext): Promise<void> {
    this.context = context;

    // Initialize readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Display welcome message with formatted header
    // @see Requirements 7.2
    console.log('\n' + FormatHelper.header('Welcome to Skeleton Crew Playground', 60));
    console.log(FormatHelper.header('A minimal plugin-driven runtime', 60));
    console.log('');

    // Display plugin initialization messages
    // @see Requirements 7.1
    console.log('Initialized Plugins:');
    console.log(FormatHelper.separator(60));
    const plugins = context.plugins.getAllPlugins();
    plugins.forEach(plugin => {
      console.log(FormatHelper.pluginInit(plugin.name));
    });
    console.log(FormatHelper.separator(60));
    console.log('');

    // Subscribe to events for logging
    context.events.on('counter:changed', (data) => {
      this.logEvent('counter:changed', data);
    });

    context.events.on('settings:changed', (data) => {
      this.logEvent('settings:changed', data);
    });

    // Show screen menu
    this.displayScreenMenu();
  }

  /**
   * Render a screen with its title, content, and action menu
   * 
   * This method is called whenever a screen needs to be displayed.
   * It receives a ScreenDefinition and is responsible for rendering it
   * in the terminal.
   * 
   * The screen.component field is used to determine which rendering
   * logic to use. In a React implementation, this would map to React components.
   * 
   * @param screen - The screen definition to render
   * @see Requirements 8.2, 8.5, 7.2
   */
  renderScreen(screen: ScreenDefinition): void {
    this.currentScreen = screen.id;

    // Display formatted screen header
    // @see Requirements 7.2
    console.log(FormatHelper.sectionHeader(screen.title, 60));

    // Render screen-specific content based on component identifier
    // This demonstrates how the UI provider maps screen definitions to actual UI
    switch (screen.component) {
      case 'HomeScreen':
        this.renderHomeScreen();
        break;
      case 'CounterScreen':
        this.renderCounterScreen();
        break;
      case 'SettingsScreen':
        this.renderSettingsScreen();
        break;
      default:
        console.log(`Screen component "${screen.component}" not implemented`);
    }

    // Display action menu
    this.displayActionMenu(screen);

    // Display event log
    this.displayEventLog();

    // Prompt for user input
    this.promptUserInput();
  }

  /**
   * Unmount the terminal UI provider
   * Closes readline and cleans up resources
   * @see Requirements 8.3
   */
  async unmount(): Promise<void> {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this.context = null;
    this.currentScreen = null;
    this.eventLog = [];
    console.log('\nGoodbye! 👋\n');
  }

  /**
   * Display the screen menu with all registered screens
   * @see Requirements 7.3
   */
  private displayScreenMenu(): void {
    if (!this.context) return;

    const screens = this.context.screens.getAllScreens();
    
    console.log('Available Screens:');
    console.log(FormatHelper.separator(60));
    screens.forEach((screen, index) => {
      console.log(FormatHelper.numberedItem(index + 1, screen.title, screen.id));
    });
    console.log(FormatHelper.separator(60));
    console.log(FormatHelper.numberedItem(0, 'Exit'));
    console.log('');

    this.promptScreenSelection();
  }

  /**
   * Prompt user to select a screen
   * @see Requirements 7.4
   */
  private promptScreenSelection(): void {
    if (!this.rl || !this.context) return;

    this.rl.question('Select a screen (number): ', (answer) => {
      const choice = parseInt(answer.trim(), 10);
      
      if (choice === 0) {
        // Exit application
        this.context?.getRuntime().shutdown();
        return;
      }

      const screens = this.context!.screens.getAllScreens();
      if (choice > 0 && choice <= screens.length) {
        const selectedScreen = screens[choice - 1];
        this.renderScreen(selectedScreen);
      } else {
        console.log(FormatHelper.error('Invalid selection. Please try again.'));
        this.displayScreenMenu();
      }
    });
  }

  /**
   * Render the home screen content
   */
  private renderHomeScreen(): void {
    console.log('Welcome to the Skeleton Crew Playground!');
    console.log('');
    console.log('This example application demonstrates:');
    console.log('  • Plugin-driven architecture');
    console.log('  • Screen registration and navigation');
    console.log('  • Action execution and state management');
    console.log('  • Event-driven communication between plugins');
    console.log('');
    console.log('Navigate to other screens to explore the features.');
    console.log('');
  }

  /**
   * Render the counter screen content
   */
  private renderCounterScreen(): void {
    const count = getCounterValue();
    console.log(`Current Count: ${count}`);
    console.log('');
  }

  /**
   * Render the settings screen content
   */
  private renderSettingsScreen(): void {
    const settings = getAllSettings();
    console.log('Current Settings:');
    Object.entries(settings).forEach(([key, value]) => {
      console.log(`  • ${key}: ${value}`);
    });
    console.log('');
  }

  /**
   * Display available actions for the current screen
   * @see Requirements 7.3
   */
  private displayActionMenu(screen: ScreenDefinition): void {
    console.log('Available Actions:');
    console.log(FormatHelper.separator(60));

    // Screen-specific actions
    switch (screen.component) {
      case 'CounterScreen':
        console.log(FormatHelper.actionItem('i', 'Increment'));
        console.log(FormatHelper.actionItem('d', 'Decrement'));
        console.log(FormatHelper.actionItem('r', 'Reset'));
        break;
      case 'SettingsScreen':
        console.log(FormatHelper.actionItem('t', 'Toggle Theme'));
        break;
    }

    // Common actions
    console.log(FormatHelper.actionItem('b', 'Back to Menu'));
    console.log(FormatHelper.actionItem('x', 'Exit'));
    console.log(FormatHelper.separator(60) + '\n');
  }

  /**
   * Display the event log
   * @see Requirements 7.5
   */
  private displayEventLog(): void {
    if (this.eventLog.length === 0) return;

    console.log('Recent Events:');
    console.log(FormatHelper.separator(60));
    this.eventLog.slice(-5).forEach((entry) => {
      console.log(FormatHelper.eventLog(entry.event, entry.data));
    });
    console.log(FormatHelper.separator(60) + '\n');
  }

  /**
   * Prompt user for input
   */
  private promptUserInput(): void {
    if (!this.rl || !this.context) return;

    this.rl.question('Enter action: ', async (answer) => {
      const input = answer.trim().toLowerCase();
      await this.handleUserInput(input);
    });
  }

  /**
   * Handle user input and execute actions
   * 
   * This method processes user commands and triggers the appropriate actions
   * through the RuntimeContext. This demonstrates how UI providers interact
   * with the runtime to execute actions.
   * 
   * Key pattern: The UI provider doesn't directly modify state - it calls
   * context.actions.runAction() which executes the action handler registered
   * by the plugin. This maintains separation between UI and business logic.
   * 
   * @see Requirements 7.4
   */
  private async handleUserInput(input: string): Promise<void> {
    if (!this.context || !this.currentScreen) return;

    try {
      switch (input) {
        case 'b':
          // Back to menu
          this.currentScreen = null;
          this.displayScreenMenu();
          break;

        case 'x':
          // Exit application
          await this.context.getRuntime().shutdown();
          break;

        case 'i':
          if (this.currentScreen === 'counter') {
            // Execute the increment action through the runtime
            // The action handler will update state and emit events
            await this.context.actions.runAction('increment');
            console.log(FormatHelper.success('Counter incremented'));
            const screen = this.context.screens.getScreen(this.currentScreen);
            if (screen) this.renderScreen(screen);
          } else {
            console.log(FormatHelper.error('Invalid action for this screen'));
            this.promptUserInput();
          }
          break;

        case 'd':
          if (this.currentScreen === 'counter') {
            await this.context.actions.runAction('decrement');
            console.log(FormatHelper.success('Counter decremented'));
            const screen = this.context.screens.getScreen(this.currentScreen);
            if (screen) this.renderScreen(screen);
          } else {
            console.log(FormatHelper.error('Invalid action for this screen'));
            this.promptUserInput();
          }
          break;

        case 'r':
          if (this.currentScreen === 'counter') {
            await this.context.actions.runAction('reset');
            console.log(FormatHelper.success('Counter reset'));
            const screen = this.context.screens.getScreen(this.currentScreen);
            if (screen) this.renderScreen(screen);
          } else {
            console.log(FormatHelper.error('Invalid action for this screen'));
            this.promptUserInput();
          }
          break;

        case 't':
          if (this.currentScreen === 'settings') {
            const newTheme = await this.context.actions.runAction('toggle-theme');
            console.log(FormatHelper.success(`Theme changed to: ${newTheme}`));
            const screen = this.context.screens.getScreen(this.currentScreen);
            if (screen) this.renderScreen(screen);
          } else {
            console.log(FormatHelper.error('Invalid action for this screen'));
            this.promptUserInput();
          }
          break;

        default:
          console.log(FormatHelper.error('Invalid input. Please try again.'));
          this.promptUserInput();
      }
    } catch (error) {
      console.log(FormatHelper.error(`Error executing action: ${error}`));
      this.promptUserInput();
    }
  }

  /**
   * Log an event to the event log
   * Keeps only the last 10 events to prevent memory issues
   */
  private logEvent(event: string, data: unknown): void {
    this.eventLog.push({ event, data });
    
    // Keep only last 10 events
    if (this.eventLog.length > 10) {
      this.eventLog.shift();
    }
  }
}

/**
 * Export singleton instance of the terminal UI provider
 */
export const terminalUIProvider = new TerminalUIProvider();
