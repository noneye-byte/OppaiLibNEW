export type DownloadState = "running" | "done" | "error";

export interface DownloadTask {
  id: number;
  label: string;
  progress: number;
  state: DownloadState;
  error?: string;
}

const tasks: DownloadTask[] = [];
let nextId = 1;

function publish() {
  window.dispatchEvent(new CustomEvent("oppai-downloads", { detail: tasks.map((task) => ({ ...task })) }));
}

export function downloadTasks(): DownloadTask[] {
  return tasks.map((task) => ({ ...task }));
}

/**
 * Starts a server import without tying it to the dialog or view that launched it.
 * Progress is intentionally coarse: the server owns the actual network transfers,
 * while the client can reliably report how many accepted import groups finished.
 */
export function runDownload(
  label: string,
  work: (report: (progress: number) => void) => Promise<void>,
): number {
  const task: DownloadTask = { id: nextId++, label, progress: 0.02, state: "running" };
  tasks.unshift(task);
  publish();

  const report = (progress: number) => {
    if (task.state !== "running") return;
    task.progress = Math.max(task.progress, Math.min(0.98, progress));
    publish();
  };

  void work(report)
    .then(() => {
      task.progress = 1;
      task.state = "done";
      publish();
      window.dispatchEvent(new CustomEvent("oppai-download-complete", { detail: { id: task.id } }));
    })
    .catch((error: unknown) => {
      task.state = "error";
      task.error = error instanceof Error ? error.message : "Download failed";
      publish();
    });

  return task.id;
}

export function dismissDownload(id: number) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index >= 0) {
    tasks.splice(index, 1);
    publish();
  }
}
