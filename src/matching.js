const weights = {
  sleep: 25,
  cleanliness: 20,
  noise: 10,
  study: 10,
  social: 20,
  branch: 50,
  district: 50,
  foodtype: 10,
  sidepreference: 10,
  futuretargets: 10,
  mostimportanttrait: 20,
  // NOTE: gender is NOT scored here — it's a hard filter in findMatches(),
  // not a soft-weighted trait. Every student left after the filter would
  // score a perfect 1 on gender anyway, so weighting it would be pointless.
};

const similarity = {
  sleep: {
    "Before 10 PM": {
      "Before 10 PM": 1,
      "10 PM – 12 AM": 0.6,
      "12 AM – 2 AM": 0.2,
      "After 2 AM": 0,
    },

    "10 PM – 12 AM": {
      "Before 10 PM": 0.6,
      "10 PM – 12 AM": 1,
      "12 AM – 2 AM": 0.7,
      "After 2 AM": 0.2,
    },

    "12 AM – 2 AM": {
      "Before 10 PM": 0.2,
      "10 PM – 12 AM": 0.7,
      "12 AM – 2 AM": 1,
      "After 2 AM": 0.7,
    },

    "After 2 AM": {
      "Before 10 PM": 0,
      "10 PM – 12 AM": 0.2,
      "12 AM – 2 AM": 0.7,
      "After 2 AM": 1,
    },
  },

  cleanliness: {
    "Very clean": {
      "Very clean": 1,
      "Generally clean": 0.7,
      "Some mess is fine": 0.3,
      "Mess doesn't bother me": 0,
    },

    "Generally clean": {
      "Very clean": 0.7,
      "Generally clean": 1,
      "Some mess is fine": 0.7,
      "Mess doesn't bother me": 0.4,
    },

    "Some mess is fine": {
      "Very clean": 0.3,
      "Generally clean": 0.7,
      "Some mess is fine": 1,
      "Mess doesn't bother me": 0.8,
    },

    "Mess doesn't bother me": {
      "Very clean": 0,
      "Generally clean": 0.4,
      "Some mess is fine": 0.8,
      "Mess doesn't bother me": 1,
    },
  },

  noise: {
    "Very quiet": {
      "Very quiet": 1,
      "Some noise is fine": 0.6,
      "Noise doesn't bother me": 0.2,
    },

    "Some noise is fine": {
      "Very quiet": 0.6,
      "Some noise is fine": 1,
      "Noise doesn't bother me": 0.8,
    },

    "Noise doesn't bother me": {
      "Very quiet": 0.2,
      "Some noise is fine": 0.8,
      "Noise doesn't bother me": 1,
    },
  },

  study: {
    "Complete silence": {
      "Complete silence": 1,
      "Some background noise": 0.6,
      "People around are fine": 0.3,
      "Mostly outside the room": 0.7,
    },

    "Some background noise": {
      "Complete silence": 0.6,
      "Some background noise": 1,
      "People around are fine": 0.8,
      "Mostly outside the room": 0.7,
    },

    "People around are fine": {
      "Complete silence": 0.3,
      "Some background noise": 0.8,
      "People around are fine": 1,
      "Mostly outside the room": 0.6,
    },

    "Mostly outside the room": {
      "Complete silence": 0.7,
      "Some background noise": 0.7,
      "People around are fine": 0.6,
      "Mostly outside the room": 1,
    },
  },

  social: {
    "Very private": {
      "Very private": 1,
      "Somewhat private": 0.8,
      "Balanced": 0.5,
      "Very social": 0.1,
    },

    "Somewhat private": {
      "Very private": 0.8,
      "Somewhat private": 1,
      "Balanced": 0.8,
      "Very social": 0.3,
    },

    "Balanced": {
      "Very private": 0.5,
      "Somewhat private": 0.8,
      "Balanced": 1,
      "Very social": 0.8,
    },

    "Very social": {
      "Very private": 0.1,
      "Somewhat private": 0.3,
      "Balanced": 0.8,
      "Very social": 1,
    },
  },

  foodtype: {
    "Vegetarian": {
      "Vegetarian": 1,
      "Non-Vegetarian": 0,
    },
    "Non-Vegetarian": {
      "Vegetarian": 0,
      "Non-Vegetarian": 1,
    },
  },

  sidepreference: {
    "Gaming": {
      "Gaming": 1,
      "sports & fitness": 0.5,
      "Music": 0.3,
      "Reading": 0.2,
    },
    "sports & fitness": {
      "Gaming": 0.5,
      "sports & fitness": 1,
      "Music": 0.6,
      "Reading": 0.4,
    },
    "Music": {
      "Gaming": 0.3,
      "sports & fitness": 0.6,
      "Music": 1,
      "Reading": 0.7,
    },
    "Reading": {
      "Gaming": 0.2,
      "sports & fitness": 0.4,
      "Music": 0.7,
      "Reading": 1,
    },
  },

  futuretargets: {
    "Higher Studies": {
      "Higher Studies": 0.9,
      "Job": 0.5,
      "Just focus on CGPA": 0.3,
    },
    "Job": {
      "Higher Studies": 0.5,
      "Job": 0.9,
      "Just focus on CGPA": 0.4,
    },
    "Just focus on CGPA": {
      "Higher Studies": 0.3,
      "Job": 0.4,
      "Just focus on CGPA": 0.9,
    },
  },

  mostimportanttrait: {
    "respectful of privacy": {
      "respectful of privacy": 1,
      "good communication": 0.7,
      "similar study goals": 0.5,
      "shared some sense of humour": 0.3,
    },
    "good communication": {
      "respectful of privacy": 0.7,
      "good communication": 1,
      "similar study goals": 0.6,
      "shared some sense of humour": 0.4,
    },
    "similar study goals": {
      "respectful of privacy": 0.5,
      "good communication": 0.6,
      "similar study goals": 1,
      "shared some sense of humour": 0.5,
    },
    "shared some sense of humour": {
      "respectful of privacy": 0.3,
      "good communication": 0.4,
      "similar study goals": 0.5,
      "shared some sense of humour": 1,
    },
  },
};

function getSimilarity(trait, userValue, studentValue) {
  if (!userValue || !studentValue) {
    return 0.5;
  }

  if (userValue === studentValue) {
    return 1;
  }

  if (similarity[trait]?.[userValue]?.[studentValue] !== undefined) {
    return similarity[trait][userValue][studentValue];
  }

  return 0.5;
}

export function calculateCompatibility(user, student) {
  let score = 0;
  let totalWeight = 0;

  for (const trait of Object.keys(weights)) {
    const weight = weights[trait];

    const similarityScore =
      trait === "branch"
        ? user[trait] === student[trait]
          ? 1
          : 0.5
        : getSimilarity(trait, user[trait], student[trait]);

    score += similarityScore * weight;
    totalWeight += weight;
  }

  return Math.round((score / totalWeight) * 100);
}

export function getMatchReasons(user, student) {
  const good = [];
  const differences = [];

  const traits = [
    "sleep",
    "cleanliness",
    "noise",
    "study",
    "social",
    "foodtype",
    "sidepreference",
    "futuretargets",
    "mostimportanttrait",
  ];

  for (const trait of traits) {
    const score = getSimilarity(trait, user[trait], student[trait]);

    if (score >= 0.8) {
      good.push(trait);
    } else if (score <= 0.3) {
      differences.push(trait);
    }
  }

  return {
    good,
    differences,
  };
}

export function findMatches(user, students) {
  // Hard filter: only ever compare students of the same gender.
  // This is intentionally NOT a weighted trait (see note on `weights` above) —
  // opposite-gender students should never appear, not just score lower.
  const sameGenderStudents = students.filter(
    (student) => student.gender === user.gender
  );

  return sameGenderStudents
    .map((student) => {
      const compatibility = calculateCompatibility(user, student);
      const reasons = getMatchReasons(user, student);

      return {
        ...student,
        compatibility,
        reasons,
      };
    })
    .sort((a, b) => b.compatibility - a.compatibility);
}

// How many of a candidate's own top matches we check the current user
// against, to decide whether the match is "mutual" (each shows up near
// the top of the other's list, not just one-directionally).
const TOP_N_FOR_MUTUAL = 3;

// Like findMatches, but also flags each result with `isMutualMatch`:
// true if the current user also appears in that candidate's own top
// matches — i.e. both people would pick each other, not just one side.
//
// `user` must include a `uid` (attach it before calling this).
// `students` should be every OTHER student in the pool (not the user).
export function findMatchesWithMutual(user, students) {
  const matches = findMatches(user, students);

  // Everyone who could appear in someone else's top list, including
  // the current user themself (since a candidate's own ranking needs
  // to be able to include the user back).
  const fullPool = [...students, user];

  return matches.map((match) => {
    const candidatePool = fullPool.filter((s) => s.uid !== match.uid);
    const candidateMatches = findMatches(match, candidatePool);
    const candidateTop = candidateMatches.slice(0, TOP_N_FOR_MUTUAL);

    const isMutualMatch = candidateTop.some((s) => s.uid === user.uid);

    return {
      ...match,
      isMutualMatch,
    };
  });
}