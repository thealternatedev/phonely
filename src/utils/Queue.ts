/**
 * A generic queue implementation with a maximum size limit.
 * Provides standard queue operations with O(1) complexity for most operations.
 * @template T The type of elements stored in the queue
 */
export class Queue<T> {
  private readonly items: T[];
  private readonly maxSize: number;

  /**
   * Creates a new Queue instance
   * @param maxSize Maximum number of items the queue can hold (defaults to 1000)
   * @throws {Error} If maxSize is less than or equal to 0
   */
  constructor(maxSize: number = 1000) {
    if (maxSize <= 0) {
      throw new Error("Queue size must be greater than 0");
    }
    this.items = [];
    this.maxSize = maxSize;
  }

  /**
   * Adds an item to the end of the queue
   * @param item The item to add
   * @returns true if the item was added successfully, false if queue is full
   */
  enqueue(item: T): boolean {
    if (this.isFull()) {
      return false;
    }
    this.items.push(item);
    return true;
  }

  /**
   * Removes and returns the first item in the queue
   * @returns The first item in the queue, or undefined if empty
   */
  dequeue(): T | undefined {
    return this.items.shift();
  }

  /**
   * Returns the first item in the queue without removing it
   * @returns The first item in the queue, or undefined if empty
   */
  peek(): T | undefined {
    return this.items[0];
  }

  /**
   * Removes all items from the queue
   */
  clear(): void {
    this.items.length = 0; // More efficient than creating new array
  }

  /**
   * Checks if the queue is empty
   * @returns true if queue contains no items
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Checks if the queue is at maximum capacity
   * @returns true if queue is full
   */
  isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  /**
   * Gets the current number of items in the queue
   * @returns Number of items currently in queue
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Returns a shallow copy of all items in the queue
   * @returns Array containing all queue items in order
   */
  values(): readonly T[] {
    return [...this.items];
  }

  /**
   * Returns the maximum size of the queue
   * @returns Maximum number of items queue can hold
   */
  getMaxSize(): number {
    return this.maxSize;
  }
}
