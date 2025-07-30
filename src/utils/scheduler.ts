

const tasks: any[] = [];
let timer: null | NodeJS.Timeout = null;

const runDailyAtMidnight = () => {
    function scheduleNext() {
        const now = new Date();
        const next = new Date();
        next.setHours(24, 0, 0, 0);
        const delay = next.getTime() - now.getTime();

        timer = setTimeout(() => {
            tasks.forEach(async item => {
                await item();
            });
            scheduleNext();
        }, delay);
    }

    scheduleNext();
};

export const beginSchedule = () => runDailyAtMidnight();
export const addTask = (task: () => void) => tasks.push(task);
export const currentTimer = () => (timer) as NodeJS.Timeout;