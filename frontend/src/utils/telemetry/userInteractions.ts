/**
 * User Interactions Tracking - Monitor user behavior and interaction patterns
 * Provides insights into user engagement and performance impact of interactions
 */

export interface UserInteraction {
  id: string;
  timestamp: number;
  type: 'click' | 'scroll' | 'keyboard' | 'touch' | 'focus' | 'hover';
  target: string; // element selector or description
  componentName?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ClickInteraction extends UserInteraction {
  type: 'click';
  coordinates: { x: number; y: number };
  button: 'left' | 'right' | 'middle';
  doubleClick: boolean;
}

export interface ScrollInteraction extends UserInteraction {
  type: 'scroll';
  scrollTop: number;
  scrollLeft: number;
  direction: 'up' | 'down' | 'left' | 'right';
  velocity: number;
}

export interface KeyboardInteraction extends UserInteraction {
  type: 'keyboard';
  key: string;
  keyCode: number;
  action: 'keydown' | 'keyup' | 'keypress';
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
}

class UserInteractionTracker {
  private interactions: UserInteraction[] = [];
  private isDevelopment = process.env.NODE_ENV === 'development';
  private maxInteractions = 1000;
  private lastScrollTime = 0;
  private scrollVelocity = 0;

  constructor() {
    if (this.isDevelopment) {
      this.setupInteractionListeners();
    }
  }

  /**
   * Track a click interaction
   */
  trackClick(
    event: MouseEvent,
    target: string,
    componentName?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isDevelopment) return;

    const clickInteraction: ClickInteraction = {
      id: `click-${Date.now()}`,
      timestamp: Date.now(),
      type: 'click',
      target,
      componentName,
      coordinates: { x: event.clientX, y: event.clientY },
      button: event.button === 0 ? 'left' : event.button === 1 ? 'middle' : 'right',
      doubleClick: event.detail === 2,
      metadata: {
        ...metadata,
        targetTagName: (event.target as Element)?.tagName,
        targetId: (event.target as Element)?.id,
        targetClassName: (event.target as Element)?.className
      }
    };

    this.addInteraction(clickInteraction);
  }

  /**
   * Track scroll interaction
   */
  trackScroll(
    event: Event,
    target: string,
    componentName?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isDevelopment) return;

    const element = event.target as Element;
    const scrollTop = element.scrollTop || window.pageYOffset;
    const scrollLeft = element.scrollLeft || window.pageXOffset;
    
    // Calculate scroll velocity
    const now = Date.now();
    const timeDiff = now - this.lastScrollTime;
    const scrollDiff = Math.abs(scrollTop - (this.interactions
      .filter(i => i.type === 'scroll')
      .pop() as ScrollInteraction)?.scrollTop || 0);
    
    this.scrollVelocity = timeDiff > 0 ? scrollDiff / timeDiff : 0;
    this.lastScrollTime = now;

    // Determine direction
    const lastScroll = this.interactions
      .filter(i => i.type === 'scroll')
      .pop() as ScrollInteraction;
    
    let direction: 'up' | 'down' | 'left' | 'right' = 'down';
    if (lastScroll) {
      if (scrollTop < lastScroll.scrollTop) direction = 'up';
      else if (scrollTop > lastScroll.scrollTop) direction = 'down';
      else if (scrollLeft < lastScroll.scrollLeft) direction = 'left';
      else if (scrollLeft > lastScroll.scrollLeft) direction = 'right';
    }

    const scrollInteraction: ScrollInteraction = {
      id: `scroll-${Date.now()}`,
      timestamp: Date.now(),
      type: 'scroll',
      target,
      componentName,
      scrollTop,
      scrollLeft,
      direction,
      velocity: this.scrollVelocity,
      metadata: {
        ...metadata,
        scrollHeight: element.scrollHeight || document.body.scrollHeight,
        scrollWidth: element.scrollWidth || document.body.scrollWidth,
        isRapidScroll: this.scrollVelocity > 1000 // px/ms
      }
    };

    this.addInteraction(scrollInteraction);
  }

  /**
   * Track keyboard interaction
   */
  trackKeyboard(
    event: KeyboardEvent,
    target: string,
    componentName?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isDevelopment) return;

    const keyboardInteraction: KeyboardInteraction = {
      id: `keyboard-${Date.now()}`,
      timestamp: Date.now(),
      type: 'keyboard',
      target,
      componentName,
      key: event.key,
      keyCode: event.keyCode,
      action: event.type as 'keydown' | 'keyup' | 'keypress',
      modifiers: {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey
      },
      metadata: {
        ...metadata,
        isSpecialKey: ['Enter', 'Tab', 'Escape', 'Space'].includes(event.key),
        isNavigation: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key),
        isShortcut: event.ctrlKey || event.metaKey
      }
    };

    this.addInteraction(keyboardInteraction);
  }

  /**
   * Track focus events
   */
  trackFocus(
    target: string,
    componentName?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isDevelopment) return;

    const focusInteraction: UserInteraction = {
      id: `focus-${Date.now()}`,
      timestamp: Date.now(),
      type: 'focus',
      target,
      componentName,
      metadata
    };

    this.addInteraction(focusInteraction);
  }

  /**
   * Track hover events with duration
   */
  trackHover(
    target: string,
    duration: number,
    componentName?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isDevelopment) return;

    const hoverInteraction: UserInteraction = {
      id: `hover-${Date.now()}`,
      timestamp: Date.now(),
      type: 'hover',
      target,
      componentName,
      duration,
      metadata: {
        ...metadata,
        isLongHover: duration > 2000 // More than 2 seconds
      }
    };

    this.addInteraction(hoverInteraction);
  }

  /**
   * Get all interactions
   */
  getInteractions(): UserInteraction[] {
    return [...this.interactions];
  }

  /**
   * Get interactions by type
   */
  getInteractionsByType(type: UserInteraction['type']): UserInteraction[] {
    return this.interactions.filter(interaction => interaction.type === type);
  }

  /**
   * Get interactions by component
   */
  getInteractionsByComponent(componentName: string): UserInteraction[] {
    return this.interactions.filter(interaction => interaction.componentName === componentName);
  }

  /**
   * Get interactions within time range
   */
  getInteractionsInRange(startTime: number, endTime: number): UserInteraction[] {
    return this.interactions.filter(
      interaction => interaction.timestamp >= startTime && interaction.timestamp <= endTime
    );
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats(): {
    total: number;
    byType: Record<string, number>;
    byComponent: Record<string, number>;
    patterns: {
      mostClickedTargets: Array<{ target: string; count: number }>;
      averageScrollVelocity: number;
      keyboardShortcuts: Array<{ combination: string; count: number }>;
      sessionDuration: number;
    };
  } {
    const byType: Record<string, number> = {};
    const byComponent: Record<string, number> = {};
    const clickCounts = new Map<string, number>();
    const shortcuts = new Map<string, number>();
    const scrollInteractions = this.getInteractionsByType('scroll') as ScrollInteraction[];

    this.interactions.forEach(interaction => {
      byType[interaction.type] = (byType[interaction.type] || 0) + 1;
      
      if (interaction.componentName) {
        byComponent[interaction.componentName] = (byComponent[interaction.componentName] || 0) + 1;
      }

      if (interaction.type === 'click') {
        clickCounts.set(interaction.target, (clickCounts.get(interaction.target) || 0) + 1);
      }

      if (interaction.type === 'keyboard') {
        const kbInteraction = interaction as KeyboardInteraction;
        if (kbInteraction.modifiers.ctrl || kbInteraction.modifiers.meta) {
          const combo = `${kbInteraction.modifiers.ctrl ? 'Ctrl+' : ''}${kbInteraction.modifiers.meta ? 'Cmd+' : ''}${kbInteraction.key}`;
          shortcuts.set(combo, (shortcuts.get(combo) || 0) + 1);
        }
      }
    });

    const mostClickedTargets = Array.from(clickCounts.entries())
      .map(([target, count]) => ({ target, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const averageScrollVelocity = scrollInteractions.length > 0
      ? scrollInteractions.reduce((sum, interaction) => sum + interaction.velocity, 0) / scrollInteractions.length
      : 0;

    const keyboardShortcuts = Array.from(shortcuts.entries())
      .map(([combination, count]) => ({ combination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const sessionDuration = this.interactions.length > 0
      ? this.interactions[this.interactions.length - 1].timestamp - this.interactions[0].timestamp
      : 0;

    return {
      total: this.interactions.length,
      byType,
      byComponent,
      patterns: {
        mostClickedTargets,
        averageScrollVelocity,
        keyboardShortcuts,
        sessionDuration
      }
    };
  }

  /**
   * Clear old interactions
   */
  clearOldInteractions(maxAge: number = 1800000): void { // 30 minutes default
    const cutoffTime = Date.now() - maxAge;
    this.interactions = this.interactions.filter(interaction => interaction.timestamp > cutoffTime);
  }

  /**
   * Clear all interactions
   */
  clearInteractions(): void {
    this.interactions = [];
  }

  /**
   * Setup global interaction listeners
   */
  private setupInteractionListeners(): void {
    // Global click tracking
    document.addEventListener('click', (event) => {
      const target = this.getElementSelector(event.target as Element);
      this.trackClick(event, target);
    });

    // Global scroll tracking (throttled)
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', (event) => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const target = event.target === document ? 'window' : this.getElementSelector(event.target as Element);
        this.trackScroll(event, target);
      }, 100); // Throttle scroll events
    }, true);

    // Global keyboard tracking
    document.addEventListener('keydown', (event) => {
      const target = this.getElementSelector(event.target as Element);
      this.trackKeyboard(event, target);
    });
  }

  /**
   * Add interaction to collection
   */
  public addInteraction(interaction: UserInteraction): void {
    this.interactions.push(interaction);

    // Prevent memory leaks
    if (this.interactions.length > this.maxInteractions) {
      this.interactions = this.interactions.slice(-this.maxInteractions / 2);
    }
  }

  /**
   * Get a useful selector for an element
   */
  private getElementSelector(element: Element): string {
    if (!element) return 'unknown';

    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }

    return element.tagName.toLowerCase();
  }
}

// Singleton instance
export const userInteractionTracker = new UserInteractionTracker();

// Development-only periodic reporting
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    userInteractionTracker.clearOldInteractions();
    
    const stats = userInteractionTracker.getInteractionStats();
    if (stats.total > 10) { // Only log if we have meaningful data
      console.group('👆 User Interaction Report');
      console.log('Total interactions:', stats.total);
      console.log('By type:', stats.byType);
      console.log('Session duration:', Math.round(stats.patterns.sessionDuration / 1000), 'seconds');
      if (stats.patterns.mostClickedTargets.length > 0) {
        console.log('Most clicked:', stats.patterns.mostClickedTargets.slice(0, 3));
      }
      console.groupEnd();
    }
  }, 300000); // Every 5 minutes
}