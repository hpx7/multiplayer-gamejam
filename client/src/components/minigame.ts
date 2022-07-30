export type minigameConfig = {
  gameData: any;
  onSuccess: Function;
  onFail: Function;
  onCancel: Function;
  parent: HTMLElement | null;
  divName: string;
  size?: { x: number; y: number };
};

export class Minigame {
  onSuccess: Function;
  onFail: Function;
  onCancel: Function;
  parent: HTMLElement | null;
  divName: string;
  myDiv: HTMLElement | null;
  size: { x: number; y: number };

  constructor(config: minigameConfig) {
    this.onSuccess = config.onSuccess;
    this.onFail = config.onFail;
    this.onCancel = config.onCancel;
    this.parent = config.parent;
    this.divName = config.divName || "myMiniGameDiv";
    this.size = config.size || { x: 600, y: 400 };
    this.myDiv = null;
  }

  createElement() {
    this.myDiv = document.createElement("div");
    this.myDiv.setAttribute("data-flag", "minigame");
    this.myDiv.style.position = `fixed`;
    this.myDiv.style.width = `${this.size.x}px`;
    this.myDiv.style.height = `${this.size.y}px`;
    this.myDiv.style.top = `50%`;
    this.myDiv.style.left = `50%`;
    this.myDiv.style.transform = `translate(-50%,-50%)`;
    this.myDiv.style.border = `1px solid black`;
    this.myDiv.style.backgroundColor = `#696a6a`;
    if (this.parent) this.parent.appendChild(this.myDiv);
  }

  destroy() {
    if (this.parent) {
      let list = document.querySelectorAll("[data-flag]");
      console.log(list);
      list.forEach(elm => elm.remove());
    }
  }

  init() {
    this.createElement();
  }
}
