const MAX_POINTS = 3;

const degToRad = (deg) => deg * Math.PI / 180;
const radToDeg = (rad) => rad * 180 / Math.PI;

class Point {
  isCollision = false;
  id;

  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.id = Math.round(Math.random() * 10000000)
    this.angle = degToRad(Math.round(Math.random() * 360));
    this.speed = Math.random() * 10 + 1;
    this.size = Math.random() * 30 + 1;
    // this.angle = degToRad(45);
  }

  setCollided(isCollision) {
    this.isCollision = isCollision;
  }
}

class QuadNode {
  children = []; // QuadNode
  points = [];

  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  split() {
    const halfWidth = Math.round(this.width / 2);
    const halfHeight = Math.round(this.height / 2);

    this.children.push(new QuadNode(this.x, this.y, halfWidth, halfHeight));
    this.children.push(new QuadNode(this.x + halfWidth, this.y, halfWidth, halfHeight));
    this.children.push(new QuadNode(this.x + halfWidth, this.y + halfHeight, halfWidth, halfHeight));
    this.children.push(new QuadNode(this.x, this.y + halfHeight, halfWidth, halfHeight));
  }

  contains(point) {
    return (point.x >= this.x
      && point.x <= this.x + this.width
      && point.y >= this.y
      && point.y <= this.y + this.height
    )
  }

  addToProperSubnode(point) {
    this.children.forEach(subnode => {
      if (subnode.contains(point)) {
        subnode.addPoint(point);
        return;
      }
    })

  }

  addPoint(point) {
    this.totalPoints += 1;
    if (this.points.length < MAX_POINTS && this.children.length === 0) {
      this.points.push(point);
    } else {
      if (this.children.length === 0) this.split();
      this.points.forEach(point => {
        this.addToProperSubnode(point);
      })
      this.points = [];
      this.addToProperSubnode(point);
    }
  }
}

class QuadTree {
  root;

  constructor(x, y, width, height) {
    this.root = new QuadNode(x, y, width, height);
  }

  addPoint(point) {
    this.root.addPoint(point);
  }
}

drawNodes = (node, ctx) => {
  ctx.strokeRect(node.x, node.y, node.width, node.height);

  if (node.children.length > 0) {
    node.children.forEach(subnode => {
      drawNodes(subnode, ctx);
    })
  }

  node.points.forEach(point => {
    ctx.beginPath();
    ctx.fillStyle = point.isCollision ? 'red' : 'blue';
    ctx.ellipse(point.x, point.y, point.size, point.size, Math.PI / 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  })
}

const areEllipsesOverlapping = (
  x1,
  y1,
  radius1,
  x2,
  y2,
  radius2
) => {
  // Calculate the distance between the centers of the two ellipses
  const distanceX = x2 - x1;
  const distanceY = y2 - y1;

  // Calculate the distance using the Pythagorean theorem
  const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

  // Check if the sum of the radii is greater than or equal to the distance
  // If true, the ellipses are overlapping
  return radius1 + radius2 >= distance;
};


detectCollisions = (node) => {
  node.points.forEach(point => {
    const isCollision = node.points.some(check => check.id !== point.id && 
      areEllipsesOverlapping(point.x, point.y, point.size, check.x, check.y, check.size));
    point.setCollided(isCollision);
  })

  if (node.children.length > 0) {
    node.children.forEach(subnode => {
      detectCollisions(subnode);
    })
  }
}

movePoint = (point) => {
  if (point.x <= 10) {
    point.angle = degToRad(90 + (Math.random() * 30 - 15));
  } else if (point.x >= 990) {
    point.angle = degToRad(270 + (Math.random() * 30 - 15))
  }

  if (point.y <= 10) {
    point.angle = degToRad(0 + (Math.random() * 30 - 15))
  } else if (point.y >= 990) {
    point.angle = degToRad(180 + (Math.random() * 30 - 15))
  }

  const newX = point.x + Math.sin(point.angle) * point.speed;
  const newY = point.y + Math.cos(point.angle) * point.speed;

  point.x = newX;
  point.y = newY;

  if (newX > 990) point.x = 990;
  if (newX < 10) point.x = 10;
  if (newY > 990) point.y = 990;
  if (newY < 10) point.y = 10;
}

movePoints = (node) => {
  node.points.forEach(point => {
    movePoint(point);
  })

  if (node.children.length > 0) {
    node.children.forEach(subnode => {
      movePoints(subnode);
    })
  }
}

checkPoints = (node, quadTree, deep = 1) => {
  if (deep > 1) {
    node.points.forEach(point => {
      if (node.contains(point) === false) {
        node.points = node.points.filter(nodePoint => nodePoint.id !== point.id);
        quadTree.addPoint(point);
        console.log(quadTree);
      }
    })
  }

  if (node.children.length > 0) {
    node.children.forEach(subnode => {
      checkPoints(subnode, quadTree, deep + 1);
    })
  }
}

joinNode = (node) => {
  const allPoints = node.children.map(subnode => subnode.points).flat();
  node.children = [];
  node.points = allPoints;
}

checkNodesToJoin = (node, deep = 1) => {
  if (deep > 1 && node.children.length > 0) {
    const allWithoutChildren = node.children.every(
      subnode => subnode.children.length === 0);

    if (allWithoutChildren) {
      const totalPoints = node.children.map(subnode => subnode.points.length).reduce((acc, curr) => acc + curr);

      if(totalPoints <= MAX_POINTS) {
        joinNode(node);
      }

    }
  }

  if (node.children.length > 0) {
    node.children.forEach(subnode => {
      checkNodesToJoin(subnode, deep + 1);
    })
  }
}

const quadTree = new QuadTree(0, 0, 1000, 1000);

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const listener = document.addEventListener('keypress', event => {
  if (event.key === 'p') {
    quadTree.addPoint(new Point(Math.round(Math.random() * 1000), Math.round(Math.random() * 1000)));
  }
})

let msPrev = window.performance.now()
const fps = 30
const msPerFrame = 1000 / fps
let frames = 0

const run = () => {
  window.requestAnimationFrame(run)

  const msNow = window.performance.now()
  const msPassed = msNow - msPrev

  if (msPassed < msPerFrame) return

  ctx.clearRect(0, 0, 1000, 1000);
  movePoints(quadTree.root);
  detectCollisions(quadTree.root);
  drawNodes(quadTree.root, ctx);
  checkPoints(quadTree.root, quadTree);
  checkNodesToJoin(quadTree.root);

  const excessTime = msPassed % msPerFrame
  msPrev = msNow - excessTime

  frames++;
}

run()