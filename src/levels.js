const C={
  red:0xff3b30,blue:0x2f80ff,yellow:0xffcc00,green:0x25d366,white:0xffffff,orange:0xff8a00,
  black:0x242b33,pink:0xff4fa3,silver:0xc5ced6,purple:0x9b51e0,cyan:0x21c7e8,lime:0x8ee000
};
const route=(name,points)=>({name,points});
const V=(id,type,color,route,start=0,speed=5.2)=>({id,type,color,route,start,speed});

// Sağdan akan trafik. Aynı giriş kolundaki araçlar güvenli aralıklarla sıralanır.
// Böylece hiçbir bölüm araçlar iç içe başlamaz; yön göstergeleri de üst üste binmez.
const R={
  westEast:route('westEast',[[-18,2],[-7,2],[7,2],[18,2]]),
  eastWest:route('eastWest',[[18,-2],[7,-2],[-7,-2],[-18,-2]]),
  northSouth:route('northSouth',[[-2,-18],[-2,-7],[-2,7],[-2,18]]),
  southNorth:route('southNorth',[[2,18],[2,7],[2,-7],[2,-18]]),

  westNorth:route('westNorth',[[-18,2],[-7,2],[-4.8,1.8],[-2.4,.6],[.3,-2.3],[1.8,-4.8],[2,-7],[2,-18]]),
  westSouth:route('westSouth',[[-18,2],[-7,2],[-4.5,2],[-3,2.2],[-2.2,3],[-2,4.5],[-2,18]]),
  eastNorth:route('eastNorth',[[18,-2],[7,-2],[4.5,-2],[3,-2.2],[2.2,-3],[2,-4.5],[2,-18]]),
  eastSouth:route('eastSouth',[[18,-2],[7,-2],[4.8,-1.8],[2.4,-.6],[-.3,2.3],[-1.8,4.8],[-2,7],[-2,18]]),

  northEast:route('northEast',[[-2,-18],[-2,-7],[-1.8,-4.8],[-.6,-2.4],[2.3,.3],[4.8,1.8],[7,2],[18,2]]),
  northWest:route('northWest',[[-2,-18],[-2,-7],[-2,-4.5],[-2.2,-3],[-3,-2.2],[-4.5,-2],[-18,-2]]),
  southEast:route('southEast',[[2,18],[2,7],[2,4.5],[2.2,3],[3,2.2],[4.5,2],[18,2]]),
  southWest:route('southWest',[[2,18],[2,7],[1.8,4.8],[.6,2.4],[-2.3,-.3],[-4.8,-1.8],[-7,-2],[-18,-2]])
};

export const levels=[
  {name:'Isınma Turu',theme:'park',vehicles:[
    V('a','sedan',C.red,R.westEast,.04,5.4),
    V('b','hatch',C.blue,R.northEast,.04,5.3),
    V('c','taxi',C.yellow,R.southNorth,.04,5.0)
  ]},
  {name:'Dönüşler Başlıyor',theme:'shops',vehicles:[
    V('a','sports',C.green,R.westNorth,.04,6.0),
    V('b','suv',C.blue,R.eastSouth,.04,5.0),
    V('c','sedan',C.red,R.northSouth,.04,5.3),
    V('d','taxi',C.yellow,R.southWest,.04,5.0)
  ]},
  {name:'Şehir Akışı',theme:'city',vehicles:[
    V('a','van',C.white,R.eastWest,.04,4.5),
    V('b','race',C.pink,R.southEast,.04,6.2),
    V('c','luxury',C.purple,R.westSouth,.04,5.1),
    V('d','taxi',C.yellow,R.northEast,.04,5.0),
    V('e','sedan',C.cyan,R.eastNorth,.18,5.3)
  ]},
  {name:'Hastane Yolu',theme:'hospital',vehicles:[
    V('a','ambulance',C.white,R.eastWest,.04,5.9),
    V('b','sports',C.red,R.westNorth,.04,6.0),
    V('c','suv',C.blue,R.southNorth,.04,5.0),
    V('d','delivery',C.orange,R.northEast,.04,4.4),
    V('e','taxi',C.yellow,R.westSouth,.16,5.0)
  ]},
  {name:'Yoğun Saat',theme:'city',vehicles:[
    V('a','police',C.white,R.westEast,.04,6.1),
    V('b','truck',C.orange,R.northSouth,.04,4.1),
    V('c','suv',C.blue,R.eastNorth,.04,5.0),
    V('d','race',C.lime,R.southWest,.04,6.2),
    V('e','van',C.white,R.westNorth,.16,4.5),
    V('f','taxi',C.yellow,R.eastWest,.16,5.0)
  ]},
  {name:'İtfaiye Önceliği',theme:'shops',vehicles:[
    V('a','fire',C.red,R.southNorth,.04,5.6),
    V('b','flatbed',C.orange,R.eastWest,.04,4.0),
    V('c','future',C.cyan,R.northWest,.04,6.25),
    V('d','ambulance',C.white,R.westSouth,.04,5.9),
    V('e','police',C.white,R.eastNorth,.19,6.1),
    V('f','luxury',C.purple,R.southEast,.19,5.0),
    V('g','hatch',C.green,R.westEast,.16,5.3)
  ]},
  {name:'Dar Sıra',theme:'city',vehicles:[
    V('a','delivery',C.orange,R.westEast,.04,4.35),
    V('b','sedan',C.red,R.westEast,.16,5.25),
    V('c','race',C.cyan,R.northSouth,.04,6.2),
    V('d','taxi',C.yellow,R.northSouth,.16,5.0),
    V('e','suv',C.blue,R.eastNorth,.04,5.0),
    V('f','van',C.white,R.southWest,.04,4.45),
    V('g','police',C.white,R.eastWest,.16,6.1),
    V('h','sports',C.pink,R.southNorth,.16,6.0)
  ]},
  {name:'Sanayi Kavşağı',theme:'industrial',vehicles:[
    V('a','tractor',C.green,R.southNorth,.03,3.6),
    V('b','truck',C.orange,R.southNorth,.16,4.0),
    V('c','flatbed',C.blue,R.westSouth,.03,4.0),
    V('d','delivery',C.red,R.eastNorth,.03,4.35),
    V('e','future',C.cyan,R.northEast,.03,6.25),
    V('f','luxury',C.purple,R.eastWest,.16,5.0),
    V('g','ambulance',C.white,R.westEast,.16,5.9),
    V('h','taxi',C.yellow,R.northWest,.16,5.0),
    V('i','race',C.lime,R.eastSouth,.29,6.2)
  ]},
  {name:'Acil Koridor',theme:'hospital',vehicles:[
    V('a','ambulance',C.white,R.northSouth,.03,6.0),
    V('b','police',C.white,R.eastWest,.03,6.2),
    V('c','fire',C.red,R.westEast,.03,5.6),
    V('d','delivery',C.orange,R.northSouth,.16,4.35),
    V('e','suv',C.blue,R.eastNorth,.16,5.0),
    V('f','race',C.pink,R.southWest,.03,6.25),
    V('g','flatbed',C.silver,R.westNorth,.16,4.0),
    V('h','taxi',C.yellow,R.eastSouth,.29,5.0),
    V('i','luxury',C.purple,R.southNorth,.16,5.0),
    V('j','hatch',C.green,R.westEast,.29,5.3)
  ]},
  {name:'Usta Trafik',theme:'city',vehicles:[
    V('a','police',C.white,R.westEast,.03,6.2),
    V('b','sedan',C.red,R.westEast,.16,5.3),
    V('c','ambulance',C.white,R.northSouth,.03,6.0),
    V('d','delivery',C.orange,R.northSouth,.16,4.35),
    V('e','fire',C.red,R.eastWest,.03,5.6),
    V('f','future',C.cyan,R.southWest,.03,6.3),
    V('g','race',C.lime,R.westNorth,.29,6.25),
    V('h','luxury',C.purple,R.eastSouth,.18,5.0),
    V('i','truck',C.orange,R.southNorth,.16,4.0),
    V('j','taxi',C.yellow,R.northEast,.29,5.0),
    V('k','suv',C.blue,R.eastNorth,.33,5.0)
  ]}
];