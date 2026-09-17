const C={red:0xe74c3c,blue:0x3185e6,yellow:0xf4c542,green:0x35b879,white:0xf1f3f5,orange:0xf28c28,black:0x252b32,pink:0xe46f9c,silver:0xaeb6bf};
const route=(kind,points)=>({kind,points});
const V=(id,type,color,route,start=0,speed=5.2)=>({id,type,color,route,start,speed});

// Sağdan akan trafik: her dönüş kendi çıkış şeridine bağlanır.
// Araçlar bu rotalardan ASLA sapmaz; oyuncu yalnızca hangi aracın ne zaman çıkacağını seçer.
const R={
  westEast:route('straight',[[-18,2],[-7,2],[7,2],[18,2]]),
  eastWest:route('straight',[[18,-2],[7,-2],[-7,-2],[-18,-2]]),
  northSouth:route('straight',[[-2,-18],[-2,-7],[-2,7],[-2,18]]),
  southNorth:route('straight',[[2,18],[2,7],[2,-7],[2,-18]]),

  westNorth:route('left',[[-18,2],[-7,2],[-4.8,1.8],[-2.4,.6],[.3,-2.3],[1.8,-4.8],[2,-7],[2,-18]]),
  westSouth:route('right',[[-18,2],[-7,2],[-4.5,2],[-3,2.2],[-2.2,3],[-2,4.5],[-2,18]]),
  eastNorth:route('right',[[18,-2],[7,-2],[4.5,-2],[3,-2.2],[2.2,-3],[2,-4.5],[2,-18]]),
  eastSouth:route('left',[[18,-2],[7,-2],[4.8,-1.8],[2.4,-.6],[-.3,2.3],[-1.8,4.8],[-2,7],[-2,18]]),

  northEast:route('left',[[-2,-18],[-2,-7],[-1.8,-4.8],[-.6,-2.4],[2.3,.3],[4.8,1.8],[7,2],[18,2]]),
  northWest:route('right',[[-2,-18],[-2,-7],[-2,-4.5],[-2.2,-3],[-3,-2.2],[-4.5,-2],[-18,-2]]),
  southEast:route('right',[[2,18],[2,7],[2,4.5],[2.2,3],[3,2.2],[4.5,2],[18,2]]),
  southWest:route('left',[[2,18],[2,7],[1.8,4.8],[.6,2.4],[-2.3,-.3],[-4.8,-1.8],[-7,-2],[-18,-2]])
};

export const levels=[
  {name:'Isınma Turu',theme:'park',vehicles:[
    V('a','sedan',C.red,R.westEast,.08,5.4),
    V('b','hatch',C.blue,R.northEast,.10,5.3),
    V('c','taxi',C.yellow,R.southNorth,.12,5.0)
  ]},
  {name:'Dönüşler Başlıyor',theme:'shops',vehicles:[
    V('a','sports',C.green,R.westNorth,.06,6.0),
    V('b','suv',C.blue,R.eastSouth,.10,5.0),
    V('c','sedan',C.red,R.northSouth,.14,5.3),
    V('d','taxi',C.yellow,R.southWest,.18,5.0)
  ]},
  {name:'Şehir Merkezi',theme:'city',vehicles:[
    V('a','van',C.white,R.eastWest,.06,4.5),
    V('b','sports',C.pink,R.southEast,.08,6.0),
    V('c','suv',C.black,R.westSouth,.12,5.0),
    V('d','taxi',C.yellow,R.northEast,.15,5.0),
    V('e','sedan',C.blue,R.eastNorth,.19,5.3)
  ]},
  {name:'Acil Geçiş',theme:'hospital',vehicles:[
    V('a','ambulance',C.white,R.eastWest,.05,5.9),
    V('b','sports',C.red,R.westNorth,.09,6.0),
    V('c','suv',C.blue,R.southNorth,.13,5.0),
    V('d','van',C.silver,R.northEast,.16,4.5),
    V('e','taxi',C.yellow,R.westSouth,.20,5.0)
  ]},
  {name:'Yoğun Saat',theme:'city',vehicles:[
    V('a','police',C.white,R.westEast,.04,6.1),
    V('b','truck',C.orange,R.northSouth,.07,4.1),
    V('c','suv',C.blue,R.eastNorth,.10,5.0),
    V('d','sports',C.green,R.southWest,.13,6.0),
    V('e','van',C.white,R.westNorth,.17,4.5),
    V('f','taxi',C.yellow,R.eastWest,.21,5.0)
  ]},
  {name:'İtfaiye Yolu',theme:'shops',vehicles:[
    V('a','fire',C.red,R.southNorth,.04,5.6),
    V('b','truck',C.orange,R.eastWest,.07,4.0),
    V('c','sports',C.blue,R.northWest,.10,6.0),
    V('d','ambulance',C.white,R.westSouth,.13,5.9),
    V('e','police',C.white,R.eastNorth,.16,6.1),
    V('f','suv',C.black,R.southEast,.20,5.0),
    V('g','hatch',C.green,R.westEast,.24,5.3)
  ]}
];
