// Dados exclusivos para o jogo "Quem Sou Eu?"
// Foco em personagens e pessoas famosas que permitem perguntas do tipo Sim/Não

export interface WhoAmICategory {
  id: string;
  name: string;
  emoji: string;
  characters: string[];
}

export const WHO_AM_I_CATEGORIES: WhoAmICategory[] = [
  {
    id: 'superheroes',
    name: 'Super-Heróis',
    emoji: '🦸',
    characters: [
      'Homem-Aranha', 'Batman', 'Superman', 'Mulher-Maravilha', 'Homem de Ferro',
      'Capitão América', 'Thor', 'Hulk', 'Viúva Negra', 'Gavião Arqueiro',
      'Pantera Negra', 'Doutor Estranho', 'Feiticeira Escarlate', 'Visão', 'Capitã Marvel',
      'Shazam', 'Aquaman', 'Flash', 'Lanterna Verde', 'Ciborgue',
      'Wolverine', 'Ciclope', 'Jean Grey', 'Tempestade', 'Mercúrio',
      'Guardiões da Galáxia', 'Groot', 'Rocket', 'Gamora', 'Drax',
      'Deadpool', 'Homem-Formiga', 'Vespa', 'Falcão', 'Soldado Invernal',
      'Loki', 'Thanos', 'Doutor Destino', 'Lex Luthor', 'Coringa'
    ]
  },
  {
    id: 'disney_pixar',
    name: 'Disney & Pixar',
    emoji: '🏰',
    characters: [
      'Mickey Mouse', 'Minnie Mouse', 'Pato Donald', 'Pateta', 'Pluto',
      'Simba', 'Mufasa', 'Scar', 'Timon', 'Pumba',
      'Elsa', 'Anna', 'Olaf', 'Kristoff', 'Hans',
      'Moana', 'Maui', 'Rapunzel', 'Flynn Rider', 'Cinderela',
      'Branca de Neve', 'Aurora', 'Bela', 'Ariel', 'Jasmine',
      'Woody', 'Buzz Lightyear', 'Jessie', 'Rex', 'Forky',
      'Nemo', 'Dory', 'Marlin', 'Wall-E', 'EVA',
      'Lightning McQueen', 'Mate', 'Remy', 'Linguini', 'Merida',
      'Vaiana', 'Encanto', 'Mirabel', 'Luisa', 'Bruno',
      'Pocahontas', 'Mulan', 'Tiana', 'Aladdin', 'Genio'
    ]
  },
  {
    id: 'movies_series',
    name: 'Filmes & Séries',
    emoji: '🎬',
    characters: [
      'Harry Potter', 'Hermione Granger', 'Rony Weasley', 'Dumbledore', 'Voldemort',
      'Luke Skywalker', 'Darth Vader', 'Princesa Leia', 'Han Solo', 'Yoda',
      'Jack Sparrow', 'Frodo', 'Gandalf', 'Aragorn', 'Legolas',
      'James Bond', 'Indiana Jones', 'John Wick', 'Ethan Hunt', 'Jason Bourne',
      'Tony Montana', 'Walter White', 'Jesse Pinkman', 'Jon Snow', 'Daenerys',
      'Tyrion Lannister', 'Cersei Lannister', 'Michael Scott', 'Sheldon Cooper', 'Joey Tribbiani',
      'Chandler Bing', 'Monica Geller', 'Ross Geller', 'Rachel Green', 'Phoebe Buffay',
      'Sherlock Holmes', 'Hermione', 'Katniss Everdeen', 'Bella Swan', 'Edward Cullen',
      'Jack Dawson', 'Rose DeWitt', 'Forrest Gump', 'Tony Stark', 'Steve Rogers'
    ]
  },
  {
    id: 'brazilian_celebrities',
    name: 'Famosos Brasileiros',
    emoji: '🇧🇷',
    characters: [
      'Xuxa', 'Pelé', 'Ayrton Senna', 'Angélica', 'Luciano Huck',
      'Faustão', 'Silvio Santos', 'Roberto Carlos', 'Caetano Veloso', 'Gilberto Gil',
      'Chico Buarque', 'Tom Jobim', 'Elis Regina', 'Ivete Sangalo', 'Anitta',
      'Claudia Leitte', 'Michel Teló', 'Luan Santana', 'Wesley Safadão', 'Gusttavo Lima',
      'Rodrigo Faro', 'Eliana', 'Ratinho', 'João Kléber', 'Datena',
      'Galvão Bueno', 'Neymar', 'Ronaldo Fenômeno', 'Ronaldinho Gaúcho', 'Zico',
      'Paulo Coelho', 'Jorge Amado', 'Clarice Lispector', 'Monteiro Lobato', 'Chaves',
      'Chapolin Colorado', 'Cascão', 'Cebolinha', 'Mônica', 'Magali'
    ]
  },
  {
    id: 'sports_stars',
    name: 'Esportistas',
    emoji: '⚽',
    characters: [
      'Pelé', 'Maradona', 'Messi', 'Cristiano Ronaldo', 'Neymar',
      'Ronaldo Fenômeno', 'Zinedine Zidane', 'Ronaldinho Gaúcho', 'Kylian Mbappé', 'Erling Haaland',
      'LeBron James', 'Michael Jordan', 'Kobe Bryant', 'Stephen Curry', 'Shaquille O\'Neal',
      'Roger Federer', 'Rafael Nadal', 'Novak Djokovic', 'Serena Williams', 'Naomi Osaka',
      'Usain Bolt', 'Carl Lewis', 'Michael Phelps', 'Simone Biles', 'Nadia Comaneci',
      'Muhammad Ali', 'Mike Tyson', 'Floyd Mayweather', 'Conor McGregor', 'Anderson Silva',
      'Lewis Hamilton', 'Ayrton Senna', 'Michael Schumacher', 'Max Verstappen', 'Fernando Alonso',
      'Tiger Woods', 'Phil Mickelson', 'Wayne Gretzky', 'Sidney Crosby', 'LeBron James'
    ]
  },
  {
    id: 'world_celebrities',
    name: 'Celebridades Mundiais',
    emoji: '⭐',
    characters: [
      'Michael Jackson', 'Madonna', 'Elvis Presley', 'Beatles', 'Beyoncé',
      'Taylor Swift', 'Lady Gaga', 'Rihanna', 'Justin Bieber', 'Ariana Grande',
      'Drake', 'Eminem', 'Jay-Z', 'Kanye West', 'Ed Sheeran',
      'Adele', 'Bruno Mars', 'The Weeknd', 'Billie Eilish', 'Dua Lipa',
      'Brad Pitt', 'Angelina Jolie', 'Leonardo DiCaprio', 'Tom Hanks', 'Meryl Streep',
      'Johnny Depp', 'Will Smith', 'Denzel Washington', 'Morgan Freeman', 'Samuel L. Jackson',
      'Jennifer Aniston', 'Jennifer Lopez', 'Kim Kardashian', 'Kylie Jenner', 'Oprah Winfrey',
      'Elon Musk', 'Bill Gates', 'Steve Jobs', 'Mark Zuckerberg', 'Jeff Bezos'
    ]
  },
  {
    id: 'historical',
    name: 'Históricos & Lendários',
    emoji: '📜',
    characters: [
      'Napoleon Bonaparte', 'Cleopatra', 'Júlio César', 'Alexandre o Grande', 'Gengis Khan',
      'Leonardo da Vinci', 'Michelangelo', 'Rafael', 'Picasso', 'Salvador Dalí',
      'Albert Einstein', 'Isaac Newton', 'Galileu Galilei', 'Nikola Tesla', 'Marie Curie',
      'Charles Darwin', 'Sigmund Freud', 'Karl Marx', 'Friedrich Nietzsche', 'Platão',
      'Aristóteles', 'Sócrates', 'Jesus Cristo', 'Buda', 'Maomé',
      'Mahatma Gandhi', 'Martin Luther King', 'Nelson Mandela', 'Abraham Lincoln', 'Winston Churchill',
      'Adolf Hitler', 'Josef Stalin', 'Mao Tsé-Tung', 'Fidel Castro', 'Che Guevara',
      'Tiradentes', 'Dom Pedro I', 'Getúlio Vargas', 'Princesa Isabel', 'Zumbi dos Palmares'
    ]
  },
  {
    id: 'games_anime',
    name: 'Games & Anime',
    emoji: '🎮',
    characters: [
      'Mario', 'Luigi', 'Princesa Peach', 'Bowser', 'Link',
      'Zelda', 'Ganondorf', 'Pikachu', 'Ash Ketchum', 'Mewtwo',
      'Sonic', 'Tails', 'Knuckles', 'Eggman', 'Crash Bandicoot',
      'Lara Croft', 'Master Chief', 'Kratos', 'Nathan Drake', 'Geralt de Rívia',
      'Naruto', 'Sasuke', 'Sakura', 'Kakashi', 'Goku',
      'Vegeta', 'Bulma', 'Gohan', 'Piccolo', 'Freezer',
      'Luffy', 'Zoro', 'Nami', 'Sanji', 'Chopper',
      'Ichigo', 'Rukia', 'Edward Elric', 'Alphonse Elric', 'Eren Yeager',
      'Mikasa', 'Levi', 'Asuka', 'Rei Ayanami', 'Shinji'
    ]
  }
];
