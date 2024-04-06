// src/utils/utils.js

// Verifica se uma nação está envolvida em um conflito
const isNationInvolvedInConflict = (nationName, conflict) => {
  return conflict.country_team1.includes(nationName) || conflict.country_team2.includes(nationName);
};

// Encontra guerras para uma nação específica
const findWarsForNation = (nationName, conflicts) => {
  return conflicts.filter(conflict => 
    isNationInvolvedInConflict(nationName, conflict) && conflict.type === "War"
  );
};

// Encontra tensões para uma nação específica
const findTensionsForNation = (nationName, conflicts) => {
  return conflicts.filter(conflict => 
    isNationInvolvedInConflict(nationName, conflict) && conflict.type === "Tension"
  );
};

// Atualiza o status da nação com base na presença de guerras ou tensões
const updateNationStatus = (nation, wars, tensions) => {
  if (wars.length > 0) {
    return "War";
  } else if (tensions.length > 0) {
    return "Tension";
  } else {
    return "Peace";
  }
};

// Adiciona conflitos (guerras e tensões) a cada nação
export const enrichNationsWithConflicts = (nations, conflicts) => {
  return nations.map(nation => {
    const wars = findWarsForNation(nation.name, conflicts);
    const tensions = findTensionsForNation(nation.name, conflicts);
    const status = updateNationStatus(nation, wars, tensions);

    return {
      ...nation,
      status, // Atualizado com base na presença de guerras ou tensões
      current_wars: wars,
      current_tensions: tensions
    };
  });
};

export const formatNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
