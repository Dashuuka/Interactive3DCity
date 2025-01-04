/* ------------------ Сцена, камера, рендерер ------------------ */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

/* ------------------ Управление камерой ------------------ */
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

/* ------------------ Свет ------------------ */
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

const moonGeometry = new THREE.SphereGeometry(0.8, 32, 32);
const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moon);

const orbitGeometry = new THREE.TorusGeometry(50, 0.1, 16, 100);
const orbitMaterial = new THREE.MeshBasicMaterial({
  color: 0x444444,
  transparent: true,
  opacity: 0.3
});
const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
orbit.rotation.x = Math.PI / 2;
scene.add(orbit);

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.radius = 4;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left = -20;
sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 20;
sunLight.shadow.camera.bottom = -20;
scene.add(sunLight);

/* ------------------ Параметры города ------------------ */
let cityParams = {
  gridSize: 15,     // "радиус" карты
  maxHeight: 15,    // максимальная высота зданий
  density: 0.5,     // плотность зданий
  greenSpace: 0.3,  // доля парков
  timeOfDay: 12     // время суток
};

/* ------------------ Описание дорог ------------------ */
const roads = [
  { direction: 'vertical',   position: -10 },
  { direction: 'vertical',   position: 0 },
  { direction: 'vertical',   position: 10 },
  { direction: 'horizontal', position: -5 },
  { direction: 'horizontal', position: 5 },
];

/* ------------------ Создание машины ------------------ */
function createVehicle() {
  const vehicle = new THREE.Group();

  // Корпус машины
  const bodyGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.4);
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
    emissive: 0x000000
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  vehicle.add(body);

  // Колёса
  const wheelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8);
  const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const wheelPositions = [
    [-0.3, -0.2,  0.2],
    [ 0.3, -0.2,  0.2],
    [-0.3, -0.2, -0.2],
    [ 0.3, -0.2, -0.2]
  ];
  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(...pos);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    vehicle.add(wheel);
  });

  // Фары
  const headlightL = new THREE.PointLight(0xffffaa, 2.0, 5);
  headlightL.position.set(0.4, 0, 0.2);
  vehicle.add(headlightL);

  const headlightR = new THREE.PointLight(0xffffaa, 2.0, 5);
  headlightR.position.set(0.4, 0, -0.2);
  vehicle.add(headlightR);

  const headlightGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const headlightMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffaa,
    emissive: 0x000000 // Только фары светятся ночью
  });
  const headlightMeshL = new THREE.Mesh(headlightGeometry, headlightMaterial);
  headlightMeshL.position.copy(headlightL.position);
  vehicle.add(headlightMeshL);

  const headlightMeshR = new THREE.Mesh(headlightGeometry, headlightMaterial);
  headlightMeshR.position.copy(headlightR.position);
  vehicle.add(headlightMeshR);

  // Ставим машину на случайную дорогу
  const chosenRoad = roads[Math.floor(Math.random() * roads.length)];
  let x = 0, z = 0;
  let dir = new THREE.Vector3(0, 0, 0);

  if (chosenRoad.direction === 'vertical') {
    x = chosenRoad.position;
    z = THREE.MathUtils.randFloatSpread(cityParams.gridSize * 2);
    dir.z = Math.random() < 0.5 ? 1 : -1;
    vehicle.rotation.y = dir.z > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    z = chosenRoad.position;
    x = THREE.MathUtils.randFloatSpread(cityParams.gridSize * 2);
    dir.x = Math.random() < 0.5 ? 1 : -1;
    vehicle.rotation.y = dir.x > 0 ? 0 : Math.PI;
  }

  vehicle.position.set(x, 0.2, z);

  // Сохраняем скорость и направление в userData
  vehicle.userData = {
    speed: 0.05 + Math.random() * 0.05,
    direction: dir,
    turning: false,
    targetDirection: dir.clone()
  };

  return vehicle;
}

/* ------------------ Создаём несколько машин ------------------ */
const vehicles = [];
const initialVehicleCount = 10;
for (let i = 0; i < initialVehicleCount; i++) {
  const vehicle = createVehicle();
  vehicles.push(vehicle);
  scene.add(vehicle);
}

/* ------------------ Функция для добавления дополнительных машин ------------------ */
function addMoreVehicles() {
  const newVehiclesCount = 5;
  for (let i = 0; i < newVehiclesCount; i++) {
    const vehicle = createVehicle();
    vehicles.push(vehicle);
    scene.add(vehicle);
  }
}

function updateVehicles() {
  const isNight = cityParams.timeOfDay < 6 || cityParams.timeOfDay > 18;

  vehicles.forEach(vehicle => {
    const dir = vehicle.userData.direction.clone();
    const speed = vehicle.userData.speed;

    vehicle.position.addScaledVector(dir, speed);

    const bounds = cityParams.gridSize;
    if (Math.abs(vehicle.position.x) > bounds || Math.abs(vehicle.position.z) > bounds) {
      vehicle.userData.direction.multiplyScalar(-1);

      if (Math.abs(vehicle.userData.direction.x) > 0) {
        vehicle.rotation.y = vehicle.userData.direction.x > 0 ? 0 : Math.PI;
      } else {
        vehicle.rotation.y = vehicle.userData.direction.z > 0 ? -Math.PI / 2 : Math.PI / 2;
      }

      if (Math.abs(vehicle.userData.direction.x) > 0) {
        vehicle.position.x = Math.sign(vehicle.position.x) * bounds;
      } else {
        vehicle.position.z = Math.sign(vehicle.position.z) * bounds;
      }
    }

    if (!vehicle.userData.turning && Math.random() < 0.005) {
      // Пересечение: близко к вертикальной и горизонтальной дорогам
      const nearVertical = roads
        .filter(r => r.direction === 'vertical')
        .some(r => Math.abs(vehicle.position.x - r.position) < 0.5);
      const nearHorizontal = roads
        .filter(r => r.direction === 'horizontal')
        .some(r => Math.abs(vehicle.position.z - r.position) < 0.5);

      if (nearVertical && nearHorizontal) {
        const possibleDirections = [
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(-1, 0, 0),
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, -1)
        ].filter(d => !d.equals(dir));

        if (possibleDirections.length > 0) {
          const newDir = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
          vehicle.userData.targetDirection.copy(newDir);
          vehicle.userData.turning = true;

          new TWEEN.Tween(vehicle.rotation)
            .to({
              y: newDir.x !== 0 ? (newDir.x > 0 ? 0 : Math.PI) :
                                   (newDir.z > 0 ? -Math.PI / 2 : Math.PI / 2)
            }, 500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {})
            .onComplete(() => {
              vehicle.userData.direction.copy(newDir);
              vehicle.userData.turning = false;
              if (newDir.x !== 0) {
                vehicle.position.x = THREE.MathUtils.clamp(vehicle.position.x, -bounds, bounds);
              } else {
                vehicle.position.z = THREE.MathUtils.clamp(vehicle.position.z, -bounds, bounds);
              }
            })
            .start();
        }
      }
    }

    TWEEN.update();

    // Обновление состояния фар и материалов окон
    vehicle.children.forEach(child => {
      if (child.type === 'PointLight') {
        child.intensity = isNight ? 2.0 : 0;
      }
      if (child.material && child.material.emissive) {
        child.material.emissive.setHex(isNight ? 0x000000 : 0x000000);
      }
    });
  });

  // Обновление эмиссивных окон зданий
  scene.traverse(object => {
    if (object.type === 'Mesh' && object.parent && object.parent.type === 'Mesh') {
      if (object.userData.glowsAtNight) {
        object.material.emissive.setHex(isNight ? 0xffffaa : 0x000000);

      }
    }
  });
}

/* ------------------ Фонари ------------------ */
function addStreetlight() {
  const lightPole = new THREE.Group();

  const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2);
  const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = 1;
  lightPole.add(pole);

  const housingGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
  const housingMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
  const housing = new THREE.Mesh(housingGeometry, housingMaterial);
  housing.position.y = 2;
  lightPole.add(housing);

  const light = new THREE.PointLight(0xffffaa, 1, 10);
  light.position.y = 1.9;
  light.castShadow = true;
  lightPole.add(light);

  // Ставим фонарь
  let position;
  let attempts = 0;
  do {
    const x = THREE.MathUtils.randFloatSpread(cityParams.gridSize * 2);
    const z = THREE.MathUtils.randFloatSpread(cityParams.gridSize * 2);
    position = new THREE.Vector3(x, 0, z);
    attempts++;
    if (attempts > 100) break;
  } while (isOnRoad(position));

  lightPole.position.copy(position);
  scene.add(lightPole);
}

function removeRandomStreetlight() {
  const streetlights = scene.children.filter(
    obj => obj.type === 'Group' && obj.children.some(child => child.type === 'PointLight')
  );
  if (streetlights.length > 0) {
    const randomIndex = Math.floor(Math.random() * streetlights.length);
    scene.remove(streetlights[randomIndex]);
  }
}

/* ------------------ Проверка, находится ли позиция на дороге ------------------ */
function isOnRoad(position) {
  const buffer = 1.4;
  for (let road of roads) {
    if (road.direction === 'vertical') {
      if (Math.abs(position.x - road.position) < buffer) {
        return true;
      }
    } else {
      if (Math.abs(position.z - road.position) < buffer) {
        return true;
      }
    }
  }
  return false;
}

/* ------------------ Создание зданий и парков ------------------ */
function createBuilding(x, z, height) {
  const geometry = new THREE.BoxGeometry(1, height, 1);
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.5, 0.5),
    specular: 0x555555,
    shininess: 30,
    emissive: 0x000000
  });
  const building = new THREE.Mesh(geometry, material);
  building.position.set(x, height / 2, z);
  building.castShadow = true;
  building.receiveShadow = true;

  // Примитивные окна
  const windowGeom = new THREE.PlaneGeometry(0.2, 0.2);
  const windowMat = new THREE.MeshPhongMaterial({
    color: 0xffffaa,
    emissive: 0xffffff,
    emissiveIntensity: 5
  });
  for (let y = 1; y < height; y += 0.5) {
    for (let side = 0; side < 4; side++) {
      for (let offset = -0.3; offset <= 0.3; offset += 0.6) {
        const window = new THREE.Mesh(windowGeom, windowMat.clone());
        window.position.y = y - height / 2;
        window.rotation.y = side * Math.PI / 2;
        if (side % 2 === 0) {
          window.position.x = 0.5;
          window.position.z = offset;
        } else {
          window.position.z = 0.5;
          window.position.x = offset;
        }
        window.userData.glowsAtNight = Math.random() < 0.3;
        building.add(window);
      }
    }
  }
  return building;
}

function createPark(x, z) {
  const parkGroup = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshPhongMaterial({ color: 0x33aa33 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  parkGroup.add(ground);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.5),
    new THREE.MeshPhongMaterial({ color: 0x553311 })
  );
  trunk.position.y = 0.25;
  trunk.castShadow = true;
  parkGroup.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.6),
    new THREE.MeshPhongMaterial({ color: 0x226622 })
  );
  leaves.position.y = 0.7;
  leaves.castShadow = true;
  parkGroup.add(leaves);

  parkGroup.position.set(x, 0, z);
  return parkGroup;
}

/* ------------------ Функции для дорог ------------------ */
function createRoad(road) {

  const roadWidth = 2;
  const length = cityParams.gridSize * 2;

  let roadGeometry, posX = 0, posZ = 0;
  if (road.direction === 'horizontal') {
    roadGeometry = new THREE.PlaneGeometry(length, roadWidth);
    posZ = road.position;
  } else {
    // vertical
    roadGeometry = new THREE.PlaneGeometry(roadWidth, length);
    posX = road.position;
  }

  const roadMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
  const mesh = new THREE.Mesh(roadGeometry, roadMaterial);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.position.set(posX, 0.01, posZ);
  scene.add(mesh);

  const lineWidth = 0.1;
  let lineGeom;
  if (road.direction === 'horizontal') {
    lineGeom = new THREE.PlaneGeometry(length, lineWidth);
  } else {
    lineGeom = new THREE.PlaneGeometry(lineWidth, length);
  }
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const line = new THREE.Mesh(lineGeom, lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(posX, 0.02, posZ);
  scene.add(line);
}

/* ------------------ Генерация города ------------------ */
function generateCity() {
  // Удаляем объекты
  while (scene.children.length > 5) {
    scene.remove(scene.children[5]);
  }

  // Земля
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(cityParams.gridSize * 2, cityParams.gridSize * 2),
    new THREE.MeshPhongMaterial({ color: 0x808080 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Создаём все дороги из массива
  roads.forEach(road => createRoad(road));

  for (let i = 0; i < 200; i++) {
    const x = THREE.MathUtils.randFloatSpread(cityParams.gridSize * 2);
    const z = THREE.MathUtils.randFloatSpread(cityParams.gridSize * 2);

    // Проверяем, не находится ли позиция на дороге
    const position = new THREE.Vector3(x, 0, z);
    if (isOnRoad(position)) {
      continue;
    }

    // С какой-то вероятностью — парк, с какой-то — здание
    if (Math.random() < cityParams.greenSpace) {
      scene.add(createPark(x, z));
    } else if (Math.random() < cityParams.density) {
      const height = Math.random() * cityParams.maxHeight + 1;
      scene.add(createBuilding(x, z, height));
    }
  }
  generateClouds();
}

/* ------------------ День-ночь ------------------ */
function updateDayNightCycle() {
  const hour = cityParams.timeOfDay;
  const angle = (hour - 6) * Math.PI / 12;

  // Позиция солнца
  sun.position.x = Math.cos(angle) * 50;
  sun.position.y = Math.sin(angle) * 50;

  // Позиция луны
  moon.position.x = Math.cos(angle + Math.PI) * 50;
  moon.position.y = Math.sin(angle + Math.PI) * 50;

  // Свет от солнца
  sunLight.position.copy(sun.position);
  const intensity = Math.sin((hour - 6) * Math.PI / 12);
  sunLight.intensity = Math.max(0, intensity);
  ambientLight.intensity = Math.max(0.1, intensity * 0.5);

  // Цвет фона
  const hue = 0.6;
  const saturation = 0.7;
  const lightness = Math.max(0.2, intensity * 0.5 + 0.2);
  scene.background = new THREE.Color().setHSL(hue, saturation, lightness);

  const isNight = hour < 6 || hour > 18;

  // Изменение эмиссивного цвета окон
  scene.traverse(object => {
    if (object.type === 'Mesh' && object.parent && object.parent.type === 'Mesh') {
      if (object.userData.glowsAtNight) {
        object.material.emissive.setHex(isNight ? 0xffffaa : 0x000000);
      }
    }
  });
}

/* ------------------ Инициализация ------------------ */
scene.background = new THREE.Color(0x87ceeb);
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

/* ------------------ Анимация ------------------ */
function animate() {
  requestAnimationFrame(animate);
  updateVehicles();
  animateClouds();
  controls.update();

  renderer.render(scene, camera);
}

generateCity();
generateClouds();
updateDayNightCycle();
animate();
/* ------------------ Облака ------------------ */
function createCloud(x, y, z) {
  const cloud = new THREE.Group();
  cloud.name = "cloud";

  const cloudMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7, // Полупрозрачность
  });

  // Генерация облака из сфер
  const cloudParts = 5 + Math.floor(Math.random() * 10); // Количество сфер
  for (let i = 0; i < cloudParts; i++) {
    const sphereGeometry = new THREE.SphereGeometry(
      1 + Math.random() * 1.5, // Разный размер сфер
      16,
      16
    );
    const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);

    // Случайное расположение в пределах небольшого диапазона
    sphere.position.set(
      Math.random() * 5 - 2.5,
      Math.random() * 2 - 1,
      Math.random() * 3 - 1.5
    );

    sphere.castShadow = true;
    sphere.receiveShadow = true;

    cloud.add(sphere);
  }

  cloud.position.set(x, y, z);
  cloud.userData = { speed: 0.01 + Math.random() * 0.02 };
  return cloud;
}

function generateClouds() {
  const cloudCount = 7; // Увеличено количество облаков
  for (let i = 0; i < cloudCount; i++) {
    const x = THREE.MathUtils.randFloatSpread(cityParams.gridSize * 3);
    const y = 15 + Math.random() * 10; // Высота облаков
    const z = THREE.MathUtils.randFloatSpread(cityParams.gridSize * 3);

    const cloud = createCloud(x, y, z);
    scene.add(cloud);
  }
}

function createNewCloud() {
  const x = -cityParams.gridSize * 3;
  const y = 15 + Math.random() * 10;
  const z = THREE.MathUtils.randFloatSpread(cityParams.gridSize * 3);

  const cloud = createCloud(x, y, z);
  scene.add(cloud);
}

function animateClouds() {
  const cloudsToRemove = [];

  scene.traverse((object) => {
    if (object.name === "cloud" && object.userData.speed) {
      object.position.x += object.userData.speed;

      // Удаление облаков, которые вышли за границу
      if (object.position.x > cityParams.gridSize * 3) {
        cloudsToRemove.push(object);
      }
    }
  });

  cloudsToRemove.forEach((cloud) => {
    scene.remove(cloud);
    createNewCloud();
  });
}

/* ------------------ Обработка изменения размера окна ------------------ */
window.addEventListener('resize', function () {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

/* ------------------ Обработчики ползунков ------------------ */
document.getElementById('densitySlider').addEventListener('input', function (e) {
  cityParams.density = e.target.value / 100;
  generateCity();
});
document.getElementById('heightSlider').addEventListener('input', function (e) {
  cityParams.maxHeight = e.target.value / 10;
  generateCity();
});
document.getElementById('greenSlider').addEventListener('input', function (e) {
  cityParams.greenSpace = e.target.value / 100;
  generateCity();
});
document.getElementById('timeSlider').addEventListener('input', function (e) {
  cityParams.timeOfDay = e.target.value;
  updateDayNightCycle();
});
document.getElementById('mapSizeSlider').addEventListener('input', function (e) {
  cityParams.gridSize = parseInt(e.target.value);
  generateCity();
});
