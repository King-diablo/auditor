

const tasks: any[] = [];
let timer: null | NodeJS.Timeout = null;

const runDailyAtMidnight = () => {
    console.log("creating schedule");

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
    console.log("creating schedule done");
};

export const beginSchedule = () => runDailyAtMidnight();
export const addTask = (task: () => void) => tasks.push(task);
export const currentTimer = () => (timer) as NodeJS.Timeout;