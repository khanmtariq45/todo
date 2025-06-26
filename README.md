import React, { useEffect, useState } from 'react';
import './App.css';

function compareStats(hero1, hero2) {
  const categories = ['intelligence', 'strength', 'speed', 'durability', 'power', 'combat'];
  let hero1Wins = 0;
  let hero2Wins = 0;
  const results = {};

  categories.forEach((cat) => {
    const val1 = hero1.powerstats[cat];
    const val2 = hero2.powerstats[cat];
    if (val1 > val2) {
      results[cat] = 1;
      hero1Wins++;
    } else if (val2 > val1) {
      results[cat] = 2;
      hero2Wins++;
    } else {
      results[cat] = 0;
    }
  });

  let winner = null;
  if (hero1Wins > hero2Wins) winner = 1;
  else if (hero2Wins > hero1Wins) winner = 2;
  else winner = 0;

  return { results, winner };
}

function App() {
  const [superheroes, setSuperheroes] = useState([]);
  const [selected, setSelected] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    fetch('/api/superheroes')
      .then((response) => response.json())
      .then((data) => setSuperheroes(data))
      .catch((error) => console.error('Error fetching superheroes:', error));
  }, []);

  // Debugging: Log selected heroes whenever they change.
  useEffect(() => {
    console.log('Selected heroes:', selected);
  }, [selected]);

  // Debugging: Log superheroes data when it is fetched
  useEffect(() => {
    console.log('Superheroes:', superheroes);
  }, [superheroes]);

  const handleSelect = (id) => {
  console.log('Selected ID:', id); // Debugging line
    const idStr = String(id);
    setSelected((prev) => {
      if (prev.includes(idStr)) {
        return prev.filter((sid) => sid !== idStr);
      } else if (prev.length < 2) {
        return [...prev, idStr];
      } else {
        return prev;
      }
    });
  };

  const handleCompare = () => setShowCompare(true);
  const handleBack = () => setShowCompare(false);

  if (showCompare && selected.length === 2) {
    const hero1 = superheroes.find((h) => String(h.id) === selected[0]);
    const hero2 = superheroes.find((h) => String(h.id) === selected[1]);
    const { results, winner } = compareStats(hero1, hero2);
    const categories = ['intelligence', 'strength', 'speed', 'durability', 'power', 'combat'];

    return (
      <div className="App">
        <header className="App-header">
          <h1>Superhero Comparison</h1>
          <div style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}>
            {[hero1, hero2].map((hero, idx) => (
              <div key={hero.id} style={{ textAlign: 'center' }}>
                <img src={hero.image} alt={hero.name} width="100" />
                <h2>{hero.name}</h2>
              </div>
            ))}
          </div>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>{hero1.name}</th>
                <th>{hero2.name}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat}>
                  <td>{cat.charAt(0).toUpperCase() + cat.slice(1)}</td>
                  <td style={{ background: results[cat] === 1 ? '#2ecc40' : undefined }}>
                    {hero1.powerstats[cat]}
                  </td>
                  <td style={{ background: results[cat] === 2 ? '#2ecc40' : undefined }}>
                    {hero2.powerstats[cat]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>
            {winner === 1
              ? `${hero1.name} wins!`
              : winner === 2
              ? `${hero2.name} wins!`
              : 'It\'s a tie!'}
          </h2>
          <button onClick={handleBack}>Back to Table</button>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Superheroes</h1>
        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th>ID</th>
              <th>Name</th>
              <th>Image</th>
              <th>Intelligence</th>
              <th>Strength</th>
              <th>Speed</th>
              <th>Durability</th>
              <th>Power</th>
              <th>Combat</th>
            </tr>
          </thead>
          <tbody>
            {superheroes.map((hero) => (
              <tr key={hero.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(String(hero.id))}
                    onChange={(e) => {
                      console.log("Checkbox toggled for hero", hero.id, "checked:", e.target.checked);
                      handleSelect(hero.id);
                    }}
                    disabled={selected.length === 2 && !selected.includes(String(hero.id))}
                  />
                </td>
                <td>{hero.id}</td>
                <td>{hero.name}</td>
                <td>
                  <img src={hero.image} alt={hero.name} width="50" />
                </td>
                <td>{hero.powerstats.intelligence}</td>
                <td>{hero.powerstats.strength}</td>
                <td>{hero.powerstats.speed}</td>
                <td>{hero.powerstats.durability}</td>
                <td>{hero.powerstats.power}</td>
                <td>{hero.powerstats.combat}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Debug: Show currently selected heroes */}
        <div style={{ marginTop: '10px', fontSize: '14px' }}>
          Selected: {selected.join(', ')}
        </div>
        <button
          onClick={handleCompare}
          style={{ marginTop: '20px' }}
        >
          Compare
        </button>
      </header>
    </div>
  );
}

export default App;
