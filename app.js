



const mapData = {
  minX: 2,
  maxX: 13,
  minY: 1,
  maxY: 21,
  blockedSpaces: {},
};



 // Options for player playerColors... these are in the same oder as our sprite sheet
const playerColors = ["red","blue","orange","yellow","green","purple"];

//Misc Helpers
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getKeyString(x, y) {
  return `${x}x${y}`;
}

function createName(){
  const prefix = randomFromArray([
    "COOL",
    "AWESOME",
    "TALENTED",
    "HANDSOME",
    "PRETTY",
    "OP",
    "FUNNY",
    "ENERGETIC",
    "CHEERFUL",
    "GOOD",
    "BAD",
    "DOPE",
  ]);
  const animal = randomFromArray([

    "DOG",
    "CAT",
    "PANDA",
    "BEAR",
    "FOX",
    "TIGER",
    "LION",
    "EAGLE",
    "BULL",
    "BUNNY",
    "DOLPHIN",
    "MONKEY",
  ]);
  return `${prefix} ${animal}`;
}

function isSolid(x,y) {

  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  )
}
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: getRandomInt(3,10), y: getRandomInt(1,13) },
  ]);
}

(function () {

  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let coins = {};
  let coinElements = {};

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");


  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
    coinRef.set({
      x,
      y,
    })

    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x, y) {
    const key = getKeyString(x, y);
    if (coins[key]) {
      //Remove this key from the data, then uptick Player's coin count
      firebase.database().ref(`coins/${key}`).remove();
      playerRef.update({
        coins: players[playerId].coins + 1,
      })
    }
  }

  function handleArrowPress(xChange=0, yChange=0) {
    const newX = players[playerId].x + xChange;
    const newY = players[playerId].y + yChange;
    if (!isSolid(newX, newY)) {
      //move to the next space
      players[playerId].x = newX;
      players[playerId].y = newY;
      if (xChange === 1) {
        players[playerId].direction = "right";
      }
      if (xChange === -1) {
        players[playerId].direction = "left";
      }
      playerRef.set(players[playerId]);
      console.log("Player moved",playerId)

      attemptGrabCoin(newX, newY);
    }
  }

  function  attemptUpdatePlayerPos(obj){
    const i = playersOnline.findIndex(e => e.id === obj.id);
    playersOnline[i] = obj
  }
  function  attemptDeletePlayer(pid){
     const i = playersOnline.findIndex(e => e.id === pid);
     playersOnline.splice(i, 1)
  }
  function  attemptDeleteCoin(x,y){
     const i = coinsOnline.findIndex(e => e.x === x && e.y === y);
     coinsOnline.splice(i, 1)
  }

  function initGame(){

    new KeyPressListener("ArrowUp",  () => handleArrowPress(0, -1))
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1))
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0))
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0))

      const allPlayersRef = firebase.database().ref(`players`);

      const allCoinsRef = firebase.database().ref(`coins`);


      allPlayersRef.on("value", (snapshot) => {
        //Fires whenever a change occurs
        players = snapshot.val() || {};
        Object.keys(players).forEach((key) => {
          const characterState = players[key];
          console.log("hehe", characterState.x)
          let el = playerElements[key];
          // Now update the DOM
          el.querySelector(".Character_name").innerText = characterState.name;
          el.querySelector(".Character_coins").innerText = characterState.coins;
          el.setAttribute("data-color", characterState.color);
          el.setAttribute("data-direction", characterState.direction);
          const left = 16 * characterState.x + "px";
          const top = 16 * characterState.y - 4 + "px";
          el.style.transform = `translate3d(${left}, ${top}, 0)`;

          //Update p5 array for all players
          attemptUpdatePlayerPos(characterState)
        })
      })

      allPlayersRef.on("child_added", (snapshot) => {
        //Fires whenever a new node is added the tree
        const addedPlayer = snapshot.val();

        playersOnline.push(addedPlayer)

        const i = playersOnline.findIndex(e => e.id === addedPlayer.id);
        if (i > -1) {
          console.log("found the guy", addedPlayer.id, "id ", i)
        }else{
          console.log("not found")
        }

        const characterElement = document.createElement("div");
        characterElement.classList.add("Character", "grid-cell");
        if (addedPlayer.id === playerId) {
          characterElement.classList.add("you");
        }
        characterElement.innerHTML = (`
          <div class="Character_shadow grid-cell"></div>
          <div class="Character_sprite grid-cell"></div>
          <div class="Character_name-container">
            <span class="Character_name"></span>
            <span class="Character_coins">0</span>
          </div>
          <div class="Character_you-arrow"></div>
        `);
        playerElements[addedPlayer.id] = characterElement;

        //Fill in some initial state
        characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
        characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
        characterElement.setAttribute("data-color", addedPlayer.color);
        characterElement.setAttribute("data-direction", addedPlayer.direction);
        const left = 16 * addedPlayer.x + "px";
        const top = 16 * addedPlayer.y - 4 + "px";
        characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      //  gameContainer.appendChild(characterElement);
      })

      //Remove character DOM element after they leave
      allPlayersRef.on("child_removed", (snapshot) => {
        const removedKey = snapshot.val().id;
        console.log("Player disconnected: ", snapshot.val())
      //  gameContainer.removeChild(playerElements[removedKey]);
        delete playerElements[removedKey];
        attemptDeletePlayer(removedKey)
      })

      allCoinsRef.on("child_added", (snapshot) => {
        const coin = snapshot.val();
        const key = getKeyString(coin.x, coin.y);
        coins[key] = true;
        coinsOnline.push(coin)

        //Create the DOM element
        const coinElement = document.createElement("div");
        coinElement.classList.add("Coin", "grid-cell");
        coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
        `;

        //Position the Element
        const left = 16 * coin.x + "px";
        const top = 16 * coin.y - 4 + "px";
        coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

        //Keep a reference for removal later and add to DOM
        coinElements[key] = coinElement;
        //gameContainer.appendChild(coinElement);
      })

      allCoinsRef.on("child_removed", (snapshot) => {
        const {x,y} = snapshot.val();
        const keyToRemove = getKeyString(x,y);
      //  gameContainer.removeChild( coinElements[keyToRemove] );
        console.log("Coin removed: ", snapshot.val())

        delete coinElements[keyToRemove];
        attemptDeleteCoin(x,y)
      })


      //Updates player name with text input
      playerNameInput.addEventListener("change", (e) => {
        const newName = e.target.value || createName();
        playerNameInput.value = newName;
        playerRef.update({
          name: newName
        })
      })

      //Update player color on button click
      playerColorButton.addEventListener("click", () => {
        const mySkinIndex = playerColors.indexOf(players[playerId].color);
        const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
        playerRef.update({
          color: nextColor
        })
      })

      //Place my first coin
      placeCoin();

  }

  firebase.auth().onAuthStateChanged((user) => {
    console.log(user);
    if(user){
      //logged in
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);

      const name = createName();
      playerNameInput.value = name;

      const {x, y} = getRandomSafeSpot();


      playerRef.set({
        id:playerId,
        name,
        direction: "right",
        color: randomFromArray(playerColors),
        x,
        y,
        coins: 0,
      })

      //Remove me from Firebase when I disconnect
      playerRef.onDisconnect().remove();

      //Begin the game now that we are signed in
      initGame();

    }else{
      //logged out
    }
  })

  firebase.auth().signInAnonymously().catch((error) => {
    var erC = error.code;
    var erM = error.message;

    console.log(erC, erM);
  });

})();

//P5 bit -------------------------
playersOnline = []
coinsOnline =[]
let fontRegular

var gif_loadImg, gif_createImg;

let tileSet;//Tileset image variable
let tileSetSize = [6400,6400];//Dimmensions of your tileset image
let tileSize = 100;//Single tile size in pixels
function preload() {
  fontRegular = loadFont('fonts/upheavtt.ttf');
  tileSet = loadImage("sprites/upscaled.png")
  gif_loadImg = loadImage("sprites/spr_idle.gif")
  gif_createImg = createImg("sprites/spr_idle.gif");


  console.log("Preload")

}
//Draw single tile based on the tile number from CSV/2d array. Refer to pyxel
function drawTile(x,y,tileNo){
  ts = tileSize;//Tile size in pixels
  tsw = tileSetSize[0] / ts;//Tileset width in tiles count
  ct = tileNo;//Current tile
  r = 0;//tileset row controller
  tf = Math.floor((ct) / tsw) * tsw;//tile count floor
  tc = Math.ceil((ct+1) / tsw) * tsw;//tile ceiling

  if(ct >= tf && ct < tc){r = tf/tsw;ct=ct-tf;}

  image(tileSet,ts*x,ts*y,ts,ts,ts*ct,ts* r,ts,ts);
}


gMap =
[[470,470,470,470,470,470,470,470,470,470,470,470,470,470,470,470],
[470,470,470,534,538,538,538,538,538,538,538,474,470,470,470,470],
[470,470,534,134,65,133,65,192,65,65,65,475,470,470,470,470],
[470,470,536,65,130,65,192,192,130,192,130,475,470,470,470,470],
[470,470,536,65,65,65,65,192,65,65,65,475,470,470,470,470],
[470,470,536,65,193,131,65,193,192,65,65,475,470,470,470,470],
[470,470,536,133,65,65,65,65,192,65,133,476,474,470,470,470],
[470,470,536,65,65,65,65,65,65,65,65,65,65,474,470,470],
[470,470,536,134,65,130,65,65,65,192,65,65,65,475,470,470],
[470,470,536,192,65,65,65,65,65,192,133,65,65,475,470,470],
[470,470,536,192,65,134,133,192,65,65,65,65,65,475,470,470],
[470,534,65,193,65,192,192,65,65,65,131,65,65,475,470,470],
[470,472,65,130,193,65,262,65,130,134,134,263,65,475,470,470],
[470,470,472,473,65,71,330,203,203,203,203,332,134,475,470,470],
[470,470,470,470,472,326,72,72,71,72,71,327,473,471,470,470],
[470,470,470,470,470,470,470,470,470,470,470,470,470,470,470,470]]


function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER);
 //tileSet.resize(128,160)
}

function draw() {
  background(0);
  for (let a = 0; a < gMap.length; a++) {
    for (let b = 0; b < gMap[a].length; b++) {
      drawTile(b,a,gMap[a][b])
    }
  }
  for (let i = playersOnline.length - 1; i >= 0; i--) {
    fill(playersOnline[i].color)

    fill("white")
    text(playersOnline[i].name, playersOnline[i].x*tileSize,playersOnline[i].y*tileSize-30)


    gif_createImg.position(playersOnline[i].x*tileSize, playersOnline[i].y*tileSize);
  }

  for (let i = coinsOnline.length - 1; i >= 0; i--) {
    fill("red")
    drawTile(coinsOnline[i].x,coinsOnline[i].y,691)
  }

  fill("white")
  textSize(30)
  textFont(fontRegular);
  playersOnline.sort((a, b) => b.coins - a.coins);
  for (let i = playersOnline.length - 1; i >= 0; i--) {
      text(playersOnline[i].name + ", " + playersOnline[i].coins, width - 200, 50*i + 50)
  }





}
