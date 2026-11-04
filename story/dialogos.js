// Textos del Modo Historia. Se pueden editar a mano o con el editor rapido
// (modo desarrollador: tecla F3 y clic en un personaje u objeto). El editor descarga
// este mismo archivo con los cambios: basta con sustituirlo en story/.
//
// Cada clave es "dueño.momento" (el dueño es un personaje u objeto del escenario).
//  - lines: lo que se dice. who = 'ethan', el id de un personaje, o null (narrador / sin nombre).
//  - piensa: (opcional) bocadillo de pensamiento que el personaje muestra unos segundos
//    despues de la conversacion, cuando Ethan esta cerca. No se puede interactuar con el.
// Los guiones (story/scenes.js) deciden que clave toca en cada momento.
window.STORY_TEXT = {
  "hermanastra.hambre": {
    "lines": [
      { "who": "hermanastra", "text": "Tengo hambre. Ethan, trae ya los langostinos." }
    ],
    "piensa": "Pues una hamburguesa ya me metía..."
  },
  "padre.3ds": {
    "lines": [
      { "who": "padre", "text": "Feliz año y próspera 3DS, Hyrule Edition." }
    ]
  },
  "lourdes.mision": {
    "lines": [
      { "who": "lourdes", "text": "Ethan, saca la tortilla de la nevera." }
    ]
  },
  "lourdes.sin_tortilla": {
    "lines": [
      { "who": "lourdes", "text": "La tortilla, Ethan. Que está en la nevera." }
    ]
  },
  "lourdes.antes_cena": {
    "lines": [
      { "who": "lourdes", "text": "Venga, siéntate, que vamos a cenar." }
    ]
  },
  "lourdes.despues_cena": {
    "lines": [
      { "who": "lourdes", "text": "¿Qué tal la tortilla?" }
    ]
  },
  "nevera.vacia": {
    "lines": [
      { "who": null, "text": "Ya no queda nada más que sacar." }
    ]
  },
  "vitro.mirar": {
    "lines": [
      { "who": "ethan", "text": "La vitro sigue rota." }
    ]
  },
  "silla.sin_tortilla": {
    "lines": [
      { "who": "ethan", "text": "Falta la tortilla de Lourdes." }
    ]
  }
};
