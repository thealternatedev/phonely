/**
 * A high-performance circular buffer queue implementation with a maximum size limit.
 * Uses pre-allocated fixed-size array and pointer arithmetic for O(1) operations.
 * @template T The type of elements stored in the queue
 */
export class Queue<T> {
  private readonly buffer: Array<T | undefined>;
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;

  /**
   * Creates a new Queue instance with pre-allocated buffer
   * @param maxSize Maximum number of items the queue can hold (defaults to 1000)
   * @throws {Error} If maxSize is less than or equal to 0
   */
  constructor(private readonly maxSize: number = 1000) {
    if (maxSize <= 0) {
      throw new Error("Queue size must be greater than 0");
    }
    // Pre-allocate fixed-size array for better performance
    this.buffer = new Array<T | undefined>(maxSize);
  }

  /**
   * Adds an item to the end of the queue using pointer arithmetic
   * @param item The item to add
   * @returns true if the item was added successfully, false if queue is full
   */
  enqueue(item: T): boolean {
    if (this.count >= this.maxSize) {
      return false;
    }
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.maxSize;
    this.count++;
    return true;
  }

  /**
   * Removes and returns the first item using pointer arithmetic
   * @returns The first item in the queue, or undefined if empty
   */
  dequeue(): T | undefined {
    if (this.count <= 0) {
      return undefined;
    }
    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined; // Help GC
    this.head = (this.head + 1) % this.maxSize;
    this.count--;
    return item;
  }

  /**
   * Returns the first item without removing it
   * @returns The first item in the queue, or undefined if empty
   */
  peek(): T | undefined {
    return this.count > 0 ? this.buffer[this.head] : undefined;
  }

  /**
   * Efficiently clears the queue by resetting pointers
   */
  clear(): void {
    // Clear references for GC
    for (let i = 0; i < this.count; i++) {
      this.buffer[(this.head + i) % this.maxSize] = undefined;
    }
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * Checks if the queue is empty
   * @returns true if queue contains no items
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Checks if the queue is at maximum capacity
   * @returns true if queue is full
   */
  isFull(): boolean {
    return this.count >= this.maxSize;
  }

  /**
   * Gets the current number of items in the queue
   * @returns Number of items currently in queue
   */
  size(): number {
    return this.count;
  }

  /**
   * Returns a shallow copy of all items in the queue
   * @returns Array containing all queue items in order
   */
  values(): readonly T[] {
    const result = new Array<T>(this.count);
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[(this.head + i) % this.maxSize];
      if (item !== undefined) {
        result[i] = item;
      }
    }
    return result;
  }

  /**
   * Returns the maximum size of the queue
   * @returns Maximum number of items queue can hold
   */
  getMaxSize(): number {
    return this.maxSize;
  }
}
