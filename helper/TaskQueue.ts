interface TaskQueueEventArgsMap {
  beforeSchedule: [() => Promise<any>];
  afterSchedule: [Promise<any>];
}

export class TaskQueue {
  public concurrency: number;
  public scheduleInterval: number;

  private running = 0;
  private queue: (() => Promise<any>)[] = [];
  private lastGlobalIntervalTimer: Promise<void> = Promise.resolve();

  private async globalIntervalTimer() {
    return this.lastGlobalIntervalTimer = new Promise((resolve, _) => {
      this.lastGlobalIntervalTimer.then(() => {
        setTimeout(resolve, this.scheduleInterval);
      });
    });
  }

  private events: {
    [Event in keyof TaskQueueEventArgsMap]: ((...args: TaskQueueEventArgsMap[Event]) => void)[]
  } = {
      beforeSchedule: [],
      afterSchedule: [],
    };

  public constructor(config: {
    concurrency?: number;
    scheduleInterval?: number;
  } = {
      concurrency: 10,
      scheduleInterval: 0,
    }
  ) {
    this.concurrency = config.concurrency as any;
    this.scheduleInterval = config.scheduleInterval as any;

    // hack queue
    this.queue.push = (task: () => Promise<any>) => {
      Array.prototype.push.call(this.queue, task);
      this.schedule();
      return this.queue.length;
    };
    this.queue.shift = () => {
      const task = Array.prototype.shift.call(this.queue);
      this.schedule();
      return task;
    }
  }

  public on<Event extends keyof TaskQueueEventArgsMap>(
    event: Event, listener: (...args: TaskQueueEventArgsMap[Event]) => void
  ) {
    this.events[event]?.push(listener)
  }

  public off<Event extends keyof TaskQueueEventArgsMap>(
    event: Event, listener: (...args: TaskQueueEventArgsMap[Event]) => void
  ) {
    const index = this.events[event]?.indexOf(listener);
    if (index !== -1) this.events[event]?.splice(index, 1);
  }

  public emit<Event extends keyof TaskQueueEventArgsMap>(
    event: Event, ...args: TaskQueueEventArgsMap[Event]
  ) {
    this.events[event]?.forEach?.(listener => listener?.(...args))
  }

  private async schedule(): Promise<void> {
    await this.globalIntervalTimer();
    this.emit('beforeSchedule', this.queue[0]);
    if (this.queue.length > 0 && this.running < this.concurrency) {
      this.running++;
      const task = this.queue.shift();
      const promise = task?.();
      if (typeof promise?.then === 'function') {
        promise.then(() => {
          this.running--;
          this.schedule();
        });
        this.emit('afterSchedule', promise);
      } else {
        this.running--;
        this.schedule();
      }
    }
  }

  public push<R>(task: () => Promise<R>): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  public async wait(): Promise<void> {
    return new Promise(resolve => {
      const self = this;
      this.on('beforeSchedule', function resolveWhenDone() {
        if (self.queue.length === 0 && self.running === 0) {
          resolve();
          self.off('beforeSchedule', resolveWhenDone)
        }
      })
    });
  }
}

// test
// const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

// const queue = new TaskQueue({ concurrency: 3, scheduleInterval: 0 });
// const result: number[] = [];
// queue.push(() => sleep(5000).then(() => result.push(1)));
// queue.push(() => sleep(2000).then(() => result.push(2)));
// queue.push(() => sleep(1000).then(() => result.push(3)));
// queue.push(() => sleep(2000).then(() => result.push(4)));

// queue.push(() => sleep(500).then(() => result.push(5)));
// queue.push(() => sleep(2000).then(() => result.push(6)));

// // result: [3, 2, 5, 4, 6, 1]
// queue.wait().then(() => console.log(result));
