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
  },
  "puerta.antes_cena": {
    "lines": [
      { "who": "ethan", "text": "Primero, la cena." }
    ]
  },
  "puerta.antes_campanadas": {
    "lines": [
      { "who": "ethan", "text": "Primero las campanadas." }
    ]
  },
  "lourdes.uvas": {
    "lines": [
      { "who": "lourdes", "text": "¡Las uvas, que empiezan los cuartos!" }
    ]
  },
  "familia.feliz_ano": {
    "lines": [
      { "who": "lourdes", "text": "¡Feliz año nuevo!" },
      { "who": "padre", "text": "¡Feliz 2023!" },
      { "who": "hermanastra", "text": "¡Feliz año!" },
      { "who": "ethan", "text": "¡Feliz año!" }
    ]
  },
  "movil.quedada": {
    "lines": [
      { "who": "Sadaba", "text": "¿qué, a qué hora?" },
      { "who": "Ekabi", "text": "a la 1.15 pasa el metro" },
      { "who": "Lier", "text": "yo no sé si llego, estoy en el Arena" }
    ]
  },
  "lourdes.barik": {
    "lines": [
      { "who": "lourdes", "text": "¿Ya estás aquí? ¿Qué se te ha olvidado ahora?" }
    ]
  },
  "canceladora.buscar": {
    "lines": [
      { "who": "ethan", "text": "A ver, la Barik..." },
      { "who": null, "text": "Ethan se palpa los bolsillos." }
    ]
  },
  "canceladora.sin_barik": {
    "lines": [
      { "who": "ethan", "text": "¡No! ¡La Barik se ha quedado en casa!" },
      { "who": "ethan", "text": "Como no corra, el metro se va sin mí." }
    ]
  },
  "barik.cogida": {
    "lines": [
      { "who": "ethan", "text": "¡Aquí estaba! Venga, al metro." }
    ]
  }
};
