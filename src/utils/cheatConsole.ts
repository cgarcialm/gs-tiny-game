import Phaser from 'phaser';

export class CheatConsole {
  private scene: Phaser.Scene;
  private isOpen: boolean = false;
  private container: Phaser.GameObjects.Container;
  private inputElement: HTMLInputElement | null = null;
  private background: Phaser.GameObjects.Rectangle;
  private promptText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Create container for the console UI
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10000); // Ensure it's always on top
    this.container.setVisible(false);

    // Create semi-transparent black background bar at the top
    this.background = scene.add.rectangle(
      0, 0,
      scene.cameras.main.width, 20,
      0x000000, 0.85
    );
    this.background.setOrigin(0, 0);

    // Create prompt text
    this.promptText = scene.add.text(4, 4, '>', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#00ff00'
    });

    this.container.add([this.background, this.promptText]);

    // Listen for Ctrl+Shift+C
    this.setupKeyboardListener();

    // Handle scene shutdown
    scene.events.on('shutdown', () => this.cleanup());
    scene.events.on('destroy', () => this.cleanup());
  }

  private setupKeyboardListener(): void {
    // Listen for keydown on the document
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+C to toggle console
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        this.toggle();
      }
      
      // ESC to close console
      if (this.isOpen && event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Store reference to remove later
    (this.scene as any)._cheatConsoleKeyHandler = handleKeyDown;
  }

  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    this.isOpen = true;
    this.container.setVisible(true);
    
    // Create HTML input element for text entry
    const canvas = this.scene.game.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factor (canvas internal size vs displayed size)
    const scaleX = rect.width / this.scene.cameras.main.width;
    const scaleY = rect.height / this.scene.cameras.main.height;
    
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.style.position = 'absolute';
    this.inputElement.style.left = `${rect.left + (14 * scaleX)}px`; // Position after ">" 
    this.inputElement.style.top = `${rect.top + (3 * scaleY)}px`; // Align vertically with prompt
    this.inputElement.style.width = `${280 * scaleX}px`;
    this.inputElement.style.height = `${14 * scaleY}px`;
    this.inputElement.style.fontFamily = 'monospace';
    this.inputElement.style.fontSize = `${10 * Math.min(scaleX, scaleY)}px`;
    this.inputElement.style.backgroundColor = 'transparent';
    this.inputElement.style.border = 'none';
    this.inputElement.style.outline = 'none';
    this.inputElement.style.color = '#00ff00';
    this.inputElement.style.zIndex = '10000';
    this.inputElement.style.padding = '0';
    this.inputElement.style.margin = '0';
    this.inputElement.style.lineHeight = '1';
    
    document.body.appendChild(this.inputElement);
    this.inputElement.focus();
    
    // Handle keyboard events - stop propagation to Phaser but handle Enter
    this.inputElement.addEventListener('keydown', (e) => {
      // Always stop propagation to prevent game from receiving keys
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Handle Enter key to submit command
      if (e.key === 'Enter') {
        this.executeCommand(this.inputElement!.value);
        this.close();
      }
    });
    
    // Stop keyup and keypress from propagating too
    const stopPropagation = (e: KeyboardEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    
    this.inputElement.addEventListener('keyup', stopPropagation, true);
    this.inputElement.addEventListener('keypress', stopPropagation, true);
  }

  private close(): void {
    this.isOpen = false;
    this.container.setVisible(false);
    
    if (this.inputElement) {
      this.inputElement.remove();
      this.inputElement = null;
    }
  }

  private executeCommand(command: string): void {
    const trimmedCommand = command.trim().toLowerCase();
    
    // Parse "klapaucius X" command
    const klapauciusMatch = trimmedCommand.match(/^klapaucius\s+(\d+)$/);
    
    if (klapauciusMatch) {
      const level = parseInt(klapauciusMatch[1], 10);
      
      if (level >= 1 && level <= 3) {
        console.log(`Cheat activated: Jumping to level ${level}`);
        this.jumpToLevel(level);
      } else {
        console.log('Invalid level. Use: klapaucius 1, 2, or 3');
      }
    } else if (trimmedCommand === 'klapaucius') {
      console.log('Usage: klapaucius <level> (1, 2, or 3)');
    } else if (trimmedCommand !== '') {
      console.log('Unknown cheat code');
    }
  }

  private jumpToLevel(level: number): void {
    // Map level numbers to appropriate scenes/states
    switch (level) {
      case 1:
        // Jump to level 1 - Northgate train station
        this.scene.scene.start('Northgate');
        break;
      case 2:
        // Jump to level 2 - Ice Hockey scene
        this.scene.scene.start('IceHockey');
        break;
      case 3:
        // Jump to level 3 - Farmers Market scene
        this.scene.scene.start('FarmersMarket');
        break;
    }
  }

  private cleanup(): void {
    if (this.inputElement) {
      this.inputElement.remove();
      this.inputElement = null;
    }
    
    const handler = (this.scene as any)._cheatConsoleKeyHandler;
    if (handler) {
      document.removeEventListener('keydown', handler);
      delete (this.scene as any)._cheatConsoleKeyHandler;
    }
  }

  public destroy(): void {
    this.cleanup();
    this.container.destroy();
  }

  public get consoleOpen(): boolean {
    return this.isOpen;
  }
}

