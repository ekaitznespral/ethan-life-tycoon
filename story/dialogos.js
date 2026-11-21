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
      { "who": "ethan", "text": "¡No! ¡La Barik se ha quedado en la cartera!" },
      { "who": "ethan", "text": "Está en el escritorio de mi cuarto. Como no corra, el metro se va sin mí." }
    ]
  },
  "cartera.barik": {
    "lines": [
      { "who": "ethan", "text": "La Barik. Sin esto no paso del metro." }
    ]
  },
  "cartera.banco": {
    "lines": [
      { "who": "ethan", "text": "La tarjeta del banco. Mejor que se quede aquí." }
    ]
  },
  "cartera.dinero": {
    "lines": [
      { "who": "ethan", "text": "Cinco euros y unas monedas. Para Nochevieja no da ni para empezar." }
    ]
  },
  "cartera.sanidad": {
    "lines": [
      { "who": "ethan", "text": "La tarjeta sanitaria. Esperemos no necesitarla esta noche..." }
    ]
  },
  "habitacion.pc": {
    "lines": [
      { "who": "ethan", "text": "Hoy no hay tiempo para viciar." }
    ]
  },
  "pasillo.bano": {
    "lines": [
      { "who": "ethan", "text": "Ahora no me hace falta." }
    ]
  },
  "pasillo.padres": {
    "lines": [
      { "who": null, "text": "La habitación de Aita y Lourdes está cerrada." }
    ]
  },
  "friki.figuritas": {
    "lines": [
      { "who": "ethan", "text": "Las figuritas de Aita. Mejor ni tocarlas." }
    ]
  },
  "friki.consolas": {
    "lines": [
      { "who": "ethan", "text": "La colección de consolas de Aita. Mejor cuidada que la vitro." }
    ]
  },
  "friki.tele": {
    "lines": [
      { "who": "ethan", "text": "Aquí se pasa Aita las tardes jugando a lo retro." }
    ]
  },
  "ekaitz.espabila": {
    "lines": [
      { "who": "ekaitz", "text": "¡Venga, espabila!" }
    ]
  },
  "ekaitz.te_espero": {
    "lines": [
      { "who": "ekaitz", "text": "Te espero." }
    ]
  },
  "ekaitz.esperando": {
    "lines": [
      { "who": "ekaitz", "text": "¿Todavía aquí? ¡Corre a por la Barik, que te espero!" }
    ]
  },
  "ekaitz.vamos": {
    "lines": [
      { "who": "ekaitz", "text": "¡Venga, pasa ya, que se nos va!" }
    ]
  },
  "ekaitz.por_fin": {
    "lines": [
      { "who": "ekaitz", "text": "¡Por fin! Venga, que llegamos justos." }
    ]
  },
  "anden.llegan": {
    "lines": [
      { "who": "igor", "text": "¡Mira quién aparece!" },
      { "who": "sadaba", "text": "¡Ya era hora, que se nos va el metro!" },
      { "who": "lier", "text": "Al final he llegado del Arena. Por los pelos." },
      { "who": "ethan", "text": "¡Feliz año, cuadrilla!" }
    ]
  },
  "anden.ekaitz": {
    "lines": [
      { "who": "ekaitz", "text": "Menos mal que te he esperado, ¿eh?" }
    ]
  },
  "anden.manso": {
    "lines": [
      { "who": "manso", "text": "¿Qué pasa, Ethan? Pensaba que no venías." }
    ]
  },
  "anden.sadaba": {
    "lines": [
      { "who": "sadaba", "text": "Llegas justo. Como siempre." }
    ]
  },
  "anden.lier": {
    "lines": [
      { "who": "lier", "text": "Del Arena hasta aquí corriendo. Me debéis una." }
    ]
  },
  "anden.igor": {
    "lines": [
      { "who": "igor", "text": "¿A dónde vamos al final? Yo me apunto a todo." }
    ]
  },
  "anden.no_salir": {
    "lines": [
      { "who": "ethan", "text": "¿A dónde voy? El metro está a punto de llegar." }
    ]
  },
  "anden.tren": {
    "lines": [
      { "who": "sadaba", "text": "¡Venga, todos dentro!" }
    ]
  },
  "vagon.aviso_L2": {
    "lines": [
      { "who": "sadaba", "text": "En la próxima, San Ignazio. Ahí cambiamos a la L1." }
    ]
  },
  "vagon.aviso_L1": {
    "lines": [
      { "who": "ekaitz", "text": "¡La próxima es Astrabudua! Preparaos." }
    ]
  },
  "vagon.destino_L2": {
    "lines": [
      { "who": "ekaitz", "text": "¡San Ignazio! ¡Venga, que nos bajamos!" }
    ]
  },
  "vagon.destino_L1": {
    "lines": [
      { "who": "javi", "text": "¡Astrabudua! ¡A la Sonora!" }
    ]
  },
  "vagon.pasado": {
    "lines": [
      { "who": "sadaba", "text": "Eh... ¿no teníamos que bajarnos en la anterior?" },
      { "who": "ekaitz", "text": "¡Nos hemos pasado la parada!" }
    ]
  },
  "vagon.aqui_no_L2": {
    "lines": [
      { "who": "ethan", "text": "Aquí no es. Nos bajamos en San Ignazio." }
    ]
  },
  "vagon.aqui_no_L1": {
    "lines": [
      { "who": "ethan", "text": "Aquí no es. Nos bajamos en Astrabudua." }
    ]
  },
  "vagon.ekaitz": {
    "lines": [
      { "who": "ekaitz", "text": "En San Ignazio cambiamos a la L1, dirección Plentzia. Y de ahí a Astrabudua." }
    ]
  },
  "vagon.manso": {
    "lines": [
      { "who": "manso", "text": "¿Cuántas paradas quedan?" }
    ]
  },
  "vagon.sadaba": {
    "lines": [
      { "who": "sadaba", "text": "La Sonora va a estar a reventar esta noche." }
    ]
  },
  "vagon.lier": {
    "lines": [
      { "who": "lier", "text": "Yo no me muevo de aquí, que vengo reventado del Arena." }
    ]
  },
  "vagon.javi": {
    "lines": [
      { "who": "javi", "text": "¡Esta noche se sale!" }
    ]
  },
  "vagon.igor": {
    "lines": [
      { "who": "igor", "text": "Avisadme cuando lleguemos, que me quedo frito." }
    ]
  },
  "vagon.javi_sube": {
    "lines": [
      { "who": "javi", "text": "¡Buenas, cuadrilla! ¿Qué pasa?" },
      { "who": "sadaba", "text": "¡Javi! Justo a tiempo, como buen barakaldés." }
    ]
  },
  "sonora.llegan": {
    "lines": [
      { "who": "ekaitz", "text": "Bueno, pues aquí está la Sonora." },
      { "who": "igor", "text": "Madre mía la cola que hay." },
      { "who": "sadaba", "text": "Tranquilos, que yo vengo preparado." },
      { "who": "ekaitz", "text": "Vamos a la rotonda de ahí a la izquierda, que ahí estamos a gusto." }
    ]
  },
  "sonora.puerta": {
    "lines": [
      { "who": "ethan", "text": "Todavía no. Primero lo primero." }
    ]
  },
  "sonora.cola": {
    "lines": [
      { "who": "Alguien de la cola", "text": "¡Eh, a la cola como todo el mundo!" }
    ]
  },
  "sonora.ekaitz": {
    "lines": [
      { "who": "ekaitz", "text": "Con esta cola vamos a tardar un rato en entrar." }
    ]
  },
  "sonora.sadaba": {
    "lines": [
      { "who": "sadaba", "text": "Las bolsas no se tocan hasta que yo diga." }
    ]
  },
  "sonora.puerta_listos": {
    "lines": [
      { "who": "ethan", "text": "Ahora sí... ahora sí que estamos listos." }
    ]
  },
  "tajada.rotonda": {
    "lines": [
      { "who": "sadaba", "text": "Aquí mismo. Buen sitio." },
      { "who": "javi", "text": "¡Sadaba, saca eso ya!" }
    ]
  },
  "tajada.sadaba_saca": {
    "lines": [
      { "who": "sadaba", "text": "Bueno, bueno... A ver qué traigo yo aquí." },
      { "who": null, "text": "Sadaba saca de las bolsas amarillas un vodka y unas Fantas de naranja." }
    ]
  },
  "tajada.destornis": {
    "lines": [
      { "who": "ekaitz", "text": "¡Destornis para todos!" },
      { "who": "igor", "text": "Yo me lo pongo cargadito." }
    ]
  },
  "tajada.sadaba": {
    "lines": [
      { "who": "sadaba", "text": "Servíos, que para eso las he traído." }
    ]
  },
  "tajada.trago1": {
    "lines": [
      { "who": "ethan", "text": "Uf... qué bien entra." }
    ]
  },
  "tajada.entonado": {
    "lines": [
      { "who": "ethan", "text": "Ya voy entonado, ya..." },
      { "who": "lier", "text": "¡Ethan ya está tocado!" }
    ]
  },
  "tajada.pedo": {
    "lines": [
      { "who": "ethan", "text": "Esto... da vueltas la rotonda, ¿no?" }
    ]
  },
  "tajada.basta": {
    "lines": [
      { "who": "ethan", "text": "Mejor no me pongo más, que si no, no entro." }
    ]
  },
  "tajada.amigos": {
    "lines": [
      { "who": "ekaitz", "text": "Venga, ponte un destorni, que vas muy seco." }
    ]
  },
  "tajada.amigos_pedo": {
    "lines": [
      { "who": "javi", "text": "¡Mírale, ya va fino!" }
    ]
  }
};
