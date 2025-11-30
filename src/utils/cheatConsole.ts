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
      
      if (level >= 0 && level <= 5) {
        console.log(`Cheat activated: Jumping to level ${level}`);
        this.jumpToLevel(level);
      } else {
        console.log('Invalid level. Use: klapaucius 0-5');
      }
    } else if (trimmedCommand === 'klapaucius') {
      console.log('Usage: klapaucius <0-5>');
      console.log('  0: Eboshi encounter (first void visit)');
      console.log('  1: Ceci returns with memory');
      console.log('  2: Seattle Traffic intro');
      console.log('  3: Smush playing with memories');
      console.log('  4: Card shuffle game');
      console.log('  5: 3D void transition & camping scene');
    } else if (trimmedCommand !== '') {
      console.log('Unknown cheat code');
    }
  }

  private jumpToLevel(level: number): void {
    const currentMusic = this.scene.registry.get('currentMusic');
    
    if (level === 5) {
      // Jump to 3D void transition - stop current music (Void3D will start full version)
      if (currentMusic) {
        currentMusic.stop();
        this.scene.registry.set('currentMusic', null);
      }
      
      // Set all memories collected
      this.scene.registry.set('completedLevels', 4);
      
      // Launch Void3D scene which then transitions to Camping
      this.scene.scene.start('Void3D');
    } else {
      // Jumping to void levels 0-4 - ensure 8-bit music is playing
      if (!currentMusic || !currentMusic.isPlaying) {
        // Start 8-bit music if not already playing
        const music = this.scene.sound.add('skyline-8bit', { loop: true, volume: 0.6 });
        music.play();
        this.scene.registry.set('currentMusic', music);
      }
      // If 8-bit is already playing, keep it going
      
      // Set the completed levels registry to the desired level
      this.scene.registry.set('completedLevels', level);
      
      // Start or restart the GameScene (void)
      this.scene.scene.start('Game');
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

