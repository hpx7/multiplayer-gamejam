import { Minigame, minigameConfig } from "./minigame";
import chest from "../assets/chest.jpg";

export class SkyrimMiniGame extends Minigame {
  bgDiv: HTMLElement | null;
  outerlockDiv: HTMLElement | null;
  innerlockDiv: HTMLElement | null;
  userDataDiv: HTMLElement | null;
  lockHoleDiv: HTMLElement | null;
  difficultyRating: "low" | "med" | "hard";
  numLockPicks: number;
  timeLimit: number;
  timerInstance: NodeJS.Timer | null;
  pickDiv: HTMLElement | null;
  tensionDiv: HTMLElement | null;
  lockPickLife: number;
  wrenchAngle: number;
  pickRange: number;
  pickAlmost: number;
  lockPickProgress: "TIGHT" | "ALMOST" | "UNLOCKED" | "TIME'S UP" | "OUT OF PICKS";
  solution: number;

  constructor(config: minigameConfig) {
    super(config);
    this.bgDiv = null;
    this.outerlockDiv = null;
    this.innerlockDiv = null;
    this.userDataDiv = null;
    this.lockHoleDiv = null;
    this.numLockPicks = 0;
    this.timeLimit = 0;
    this.timerInstance = null;
    this.pickDiv = null;
    this.tensionDiv = null;
    this.lockPickLife = 0;
    this.wrenchAngle = 0;
    this.pickRange = 0;
    this.pickAlmost = 0;
    this.lockPickProgress = "TIGHT";
    this.solution = 0;
    this.difficultyRating = config.gameData.difficulty || "low";
  }

  createElement(): void {
    super.createElement();
    this.bgDiv = document.createElement("div");
    this.bgDiv.style.width = `100%`;
    this.bgDiv.style.height = `100%`;
    this.bgDiv.style.zIndex = `-1`;
    this.bgDiv.style.backgroundImage = `url(${chest})`;
    this.bgDiv.style.backgroundRepeat = "no repeat";
    this.bgDiv.style.backgroundSize = "cover";
    this.bgDiv.style.filter = `blur(5px)`;
    if (this.myDiv) this.myDiv.appendChild(this.bgDiv);

    /***
     * lockpicking field
     */

    //#region
    this.outerlockDiv = document.createElement("div");
    this.outerlockDiv.style.width = `400px`;
    this.outerlockDiv.style.height = `400px`;
    this.outerlockDiv.style.zIndex = `1`;
    this.outerlockDiv.style.position = `absolute`;
    this.outerlockDiv.style.top = `50%`;
    this.outerlockDiv.style.left = `15%`;

    this.outerlockDiv.style.transform = `translateY(-50%)`;
    if (this.myDiv) this.myDiv.appendChild(this.outerlockDiv);

    this.innerlockDiv = document.createElement("div");
    this.innerlockDiv.style.width = `100%`;
    this.innerlockDiv.style.height = `100%`;
    this.innerlockDiv.style.zIndex = `2`;
    this.innerlockDiv.style.position = `relative`;
    this.innerlockDiv.style.top = `0px`;
    this.innerlockDiv.style.left = `0px`;
    this.innerlockDiv.style.border = `darkgrey 1px solid`;
    this.innerlockDiv.style.borderRadius = `50%`;
    this.innerlockDiv.style.backgroundColor = `darkgrey`;
    this.outerlockDiv.appendChild(this.innerlockDiv);

    this.lockHoleDiv = document.createElement("div");
    this.lockHoleDiv.style.width = `30px`;
    this.lockHoleDiv.style.height = `100px`;
    this.lockHoleDiv.style.zIndex = `2`;
    this.lockHoleDiv.style.position = `absolute`;
    this.lockHoleDiv.style.bottom = `0px`;
    this.lockHoleDiv.style.left = `50%`;
    this.lockHoleDiv.style.transform = `translateX(-50%)`;
    this.lockHoleDiv.style.border = `black 1px solid`;
    this.lockHoleDiv.style.borderRadius = `5px`;
    this.lockHoleDiv.style.backgroundColor = `black`;

    this.innerlockDiv.appendChild(this.lockHoleDiv);

    //pick div
    this.pickDiv = document.createElement("div");
    this.pickDiv.setAttribute("id", "pick");
    this.pickDiv.style.width = `30px`;
    this.pickDiv.style.height = `400px`;
    this.pickDiv.style.zIndex = `2`;
    this.pickDiv.style.position = `absolute`;
    this.pickDiv.style.top = `50%`;
    this.pickDiv.style.left = `57%`;
    this.pickDiv.style.transform = `translateX(45px) rotate(-20deg)`;
    this.pickDiv.style.border = `blue 1px solid`;
    this.pickDiv.style.borderRadius = `5px`;
    this.pickDiv.style.backgroundColor = `#222222`;
    this.lockHoleDiv.appendChild(this.pickDiv);

    //tension wrench
    //pick div
    this.tensionDiv = document.createElement("div");
    this.tensionDiv.style.position = `absolute`;
    this.tensionDiv.style.top = `80%`;
    this.tensionDiv.style.left = `200px`;
    this.tensionDiv.setAttribute("id", "wrench");
    this.tensionDiv.style.width = `0`;
    this.tensionDiv.style.height = `0`;
    this.tensionDiv.style.transform = `rotate(${this.wrenchAngle}deg)`;

    let innertensiondiv = document.createElement("div");
    innertensiondiv.style.width = `500px`;
    innertensiondiv.style.height = `15px`;
    this.tensionDiv.style.zIndex = `5`;
    innertensiondiv.style.transform = `translateY(-50%)`;
    innertensiondiv.style.borderRadius = `5px`;
    innertensiondiv.style.backgroundColor = `#222222`;
    this.tensionDiv.appendChild(innertensiondiv);
    this.outerlockDiv.appendChild(this.tensionDiv);
    //#endregion

    /***
     * userdata field
     */

    //#region
    this.userDataDiv = document.createElement("div");
    this.userDataDiv.style.width = `300px`;
    this.userDataDiv.style.height = `400px`;
    this.userDataDiv.style.zIndex = `1`;
    this.userDataDiv.style.position = `absolute`;
    this.userDataDiv.style.top = `50%`;
    this.userDataDiv.style.right = `15%`;
    this.userDataDiv.style.transform = `translateY(-50%)`;
    this.userDataDiv.style.border = `white 3px solid`;
    this.userDataDiv.style.borderRadius = `10px`;
    this.userDataDiv.style.backgroundColor = `#ffffff75`;
    this.userDataDiv.style.textAlign = "center";
    this.userDataDiv.style.display = "flex";
    this.userDataDiv.style.justifyContent = "center";
    this.userDataDiv.style.alignContent = "center";
    this.userDataDiv.style.flexDirection = "column";

    if (this.myDiv) this.myDiv.appendChild(this.userDataDiv);

    let text1 = document.createElement("p");
    let text2 = document.createElement("span");

    text1.innerText = "Lock Picks Remaining: ";
    text1.style.fontFamily = `pirateFont`;
    text1.style.fontSize = `large`;
    this.userDataDiv.appendChild(text1);

    text2.innerText = `${this.numLockPicks}`;
    text2.style.fontFamily = `pirateFont`;
    text2.style.fontSize = `xx-large`;
    text2.setAttribute("id", "numPicks");
    this.userDataDiv.appendChild(text2);

    text1 = document.createElement("p");
    text1.innerText = "Time Remaining: ";
    text1.style.fontFamily = `pirateFont`;
    text1.style.fontSize = `large`;
    this.userDataDiv.appendChild(text1);

    text2 = document.createElement("span");
    text2.innerText = `${this.timeLimit}`;
    text2.setAttribute("id", "timer");

    text2.style.fontFamily = `pirateFont`;
    text2.style.fontSize = `xx-large`;
    this.userDataDiv.appendChild(text2);

    text1 = document.createElement("p");
    text1.innerText = "Lock Progression: ";
    text1.style.fontFamily = `pirateFont`;
    text1.style.fontSize = `large`;
    this.userDataDiv.appendChild(text1);

    text2 = document.createElement("span");
    text2.innerText = `${this.lockPickProgress}`;
    text2.setAttribute("id", "progression");

    text2.style.fontFamily = `pirateFont`;
    text2.style.fontSize = `xx-large`;
    this.userDataDiv.appendChild(text2);

    text1 = document.createElement("p");
    text1.innerText = "Lock Pick Life: ";
    text1.style.fontFamily = `pirateFont`;
    text1.style.fontSize = `large`;
    this.userDataDiv.appendChild(text1);

    text2 = document.createElement("span");
    text2.innerText = `${this.lockPickLife}`;
    text2.setAttribute("id", "lockpicklife");

    text2.style.fontFamily = `pirateFont`;
    text2.style.fontSize = `xx-large`;
    this.userDataDiv.appendChild(text2);

    //#endregion
  }

  init() {
    this.wrenchAngle = 180;
    this.lockPickProgress = "TIGHT";
    switch (this.difficultyRating) {
      case "low":
        this.numLockPicks = 5;
        this.lockPickLife = 100;
        this.timeLimit = 120;
        this.pickRange = 20;
        this.pickAlmost = 30;
        break;
      case "med":
        this.numLockPicks = 4;
        this.lockPickLife = 75;
        this.timeLimit = 90;
        this.pickRange = 15;
        this.pickAlmost = 20;

        break;
      case "hard":
        this.numLockPicks = 2;
        this.lockPickLife = 50;
        this.timeLimit = 60;
        this.pickAlmost = 10;
        this.pickRange = 5;

        break;
      default:
        this.numLockPicks = 5;
        this.timeLimit = 120;
        this.lockPickLife = 100;
        this.pickRange = 30;
        this.pickAlmost = 30;
        break;
    }
    super.init();
    //set timer
    this.solution = Math.floor(Math.random() * 359);
    this.timerInstance = setInterval(() => {
      //update time remaining
      this.timeLimit -= 1;
      //update UI
      this.updateTimer();

      //trigger something if time left is 0
      if (this.timeLimit === 0) {
        //TODO do something
        this.lockPickProgress = "TIME'S UP";
        this.updateLockPickProgress();
        if (this.timerInstance) clearInterval(this.timerInstance);

        this.onFail();
      }
    }, 1000);
    //set inputevents

    document.addEventListener("keydown", e => {
      switch (e.code) {
        case "KeyZ":
          //rotate lock CCW
          this.moveLock("CCW");
          break;
        case "KeyX":
          //rotate lock CW
          this.moveLock("CW");
          break;
        case "Enter":
          //test lock
          this.testLock();
          break;
        case "Escape":
          //gameover

          if (this.timerInstance) clearInterval(this.timerInstance);
          this.onCancel();
          break;
      }
    });
  }

  updateLockPickProgress() {
    //set ui to tight
    let progression = document.getElementById("progression");
    if (progression) progression.innerText = this.lockPickProgress;
  }

  updateTimer() {
    let myTimer = document.getElementById("timer");
    if (myTimer) myTimer.innerText = `${this.timeLimit}`;
  }

  testLock() {
    //compare solution to angle

    let different = Math.abs(this.solution - this.wrenchAngle);

    //console.log("test", different, this.pickRange, this.pickAlmost);
    if (different < this.pickRange && this.numLockPicks > 0) {
      console.trace("how?", different, this.pickRange);
      this.lockPickProgress = "UNLOCKED";
      this.updateLockPickProgress();
      //gameover
      if (this.timerInstance) clearInterval(this.timerInstance);
      this.onSuccess();
      //unlocked
      //do unlock stuff
      console.log(
        `solution: ${this.solution}, angle: ${this.wrenchAngle} difference: ${different} lockpick life: ${this.lockPickLife}`
      );
      return;
    }
    if (different < this.pickAlmost) {
      this.lockPickProgress = "ALMOST";
      this.updateLockPickProgress();
      //set ui to almost
      //reduce lifepick life
      this.damageLifePick();
      this.updateLockPickProgress();
      console.log(
        `solution: ${this.solution}, angle: ${this.wrenchAngle} difference: ${different} lockpick life: ${this.lockPickLife}`
      );

      return;
    }
    this.lockPickProgress = "TIGHT";
    this.damageLifePick();
    this.updateLockPickProgress();
    console.log(
      `solution: ${this.solution}, angle: ${this.wrenchAngle} difference: ${different} lockpick life: ${this.lockPickLife}`
    );
    //reduce lifepick life

    return;
  }

  damageLifePick() {
    this.lockPickLife -= 10;
    console.log(this.lockPickLife);
    this.updateLockPickLife();
    if (this.lockPickLife <= 0) {
      //break lifepick
      //playsound for breaking pick

      this.numLockPicks -= 1;
      let text2 = document.getElementById("numPicks");
      if (text2) text2.innerText = `${this.numLockPicks}`;

      if (this.numLockPicks <= 0) {
        //gameover
        this.lockPickProgress = "OUT OF PICKS";
        this.updateLockPickProgress();
        if (this.timerInstance) clearInterval(this.timerInstance);
        console.log(this.onFail);
        this.onFail();
        return;
      }

      if (this.difficultyRating == "low") this.lockPickLife = 100;
      else if (this.difficultyRating == "med") this.lockPickLife = 75;
      else if (this.difficultyRating == "hard") this.lockPickLife = 50;
      else this.lockPickLife = 100;
      this.updateLockPickLife();
    }
  }

  updateLockPickLife() {
    //set ui to tight
    let lpl = document.getElementById("lockpicklife");
    if (lpl) lpl.innerText = `${this.lockPickLife}`;
  }

  moveLock(direction: "CW" | "CCW") {
    if (direction === "CW") this.wrenchAngle += 2;
    else this.wrenchAngle -= 2;
    if (this.wrenchAngle > 359) this.wrenchAngle -= 360;
    else if (this.wrenchAngle < 0) this.wrenchAngle += 360;
    if (this.tensionDiv) this.tensionDiv.style.transform = `rotate(${this.wrenchAngle}deg)`;
  }
}
