const june2024 = {
  paper11: {
    questionPdf: "https://www.cambridgeinternational.org/Images/567744-june-2024-question-paper-11.pdf",
    markSchemePdf: "https://www.cambridgeinternational.org/Images/567738-june-2024-mark-scheme-paper-11.pdf",
  },
  paper21: {
    questionPdf: "https://www.cambridgeinternational.org/Images/567745-june-2024-question-paper-21.pdf",
    markSchemePdf: "https://www.cambridgeinternational.org/Images/567739-june-2024-mark-scheme-paper-21.pdf",
  },
  paper31: {
    questionPdf: "https://www.cambridgeinternational.org/Images/567746-june-2024-question-paper-31.pdf",
    markSchemePdf: "https://www.cambridgeinternational.org/Images/567740-june-2024-mark-scheme-paper-31.pdf",
  },
  paper41: {
    questionPdf: "https://www.cambridgeinternational.org/Images/673793-june-2024-question-paper-41.pdf",
    markSchemePdf: "https://www.cambridgeinternational.org/Images/673787-june-2024-mark-scheme-paper-41.pdf",
  },
  paper51: {
    questionPdf: "https://www.cambridgeinternational.org/Images/673795-june-2024-question-paper-51.pdf",
    markSchemePdf: "https://www.cambridgeinternational.org/Images/673789-june-2024-mark-scheme-paper-51.pdf",
  },
  paper61: {
    questionPdf: "https://www.cambridgeinternational.org/Images/673797-june-2024-question-paper-61.pdf",
    markSchemePdf: "https://www.cambridgeinternational.org/Images/673791-june-2024-mark-scheme-paper-61.pdf",
  },
};

const baseQuestion = {
  board: "CAIE",
  subjectName: "数学",
  syllabusCode: "9709",
  qualification: "AS/A Level",
  year: 2024,
  series: "May/June",
  variant: "1",
};

const cieMathQuestionBank = [
  createQuestion("9709-2024-mj-11-q1", "11", "pure", "Paper 1 Pure Mathematics 1", "1", "Completing the square and exact roots", "Quadratics and algebra", "Rearrange an expression into completed-square form, then solve exactly.", "Use completed-square form, substitution, and exact radical solutions.", ["quadratic", "complete square", "algebra"], june2024.paper11),
  createQuestion("9709-2024-mj-11-q2", "11", "pure", "Paper 1 Pure Mathematics 1", "2", "Sine graph transformations", "Trigonometric graphs", "Describe transformations from a sine curve and write the transformed function.", "Credit reflection, stretch or translation language, and the final function.", ["trigonometry", "sin", "graph"], june2024.paper11),
  createQuestion("9709-2024-mj-11-q3", "11", "pure", "Paper 1 Pure Mathematics 1", "3", "Binomial expansion coefficient", "Binomial expansion", "Use a coefficient to find a constant, then find a related coefficient.", "Apply binomial coefficients and combine target-power terms only.", ["binomial", "coefficient"], june2024.paper11),
  createQuestion("9709-2024-mj-21-q1", "21", "pure", "Paper 2 Pure Mathematics 2", "1", "Stationary point of a trigonometric curve", "Differentiation", "Differentiate a trigonometric expression and solve in a restricted interval.", "Correct derivative, zero-gradient equation, and coordinate accuracy.", ["differentiation", "stationary point", "trigonometry"], june2024.paper21),
  createQuestion("9709-2024-mj-21-q2", "21", "pure", "Paper 2 Pure Mathematics 2", "2", "Implicit differentiation at a point", "Implicit differentiation", "Find the gradient from an equation involving x, y, and logarithmic terms.", "Credit implicit differentiation, chain/product rules, and substitution.", ["implicit differentiation", "gradient", "logarithm"], june2024.paper21),
  createQuestion("9709-2024-mj-31-q1", "31", "pure", "Paper 3 Pure Mathematics 3", "1", "Series expansion to a required power", "Series expansion", "Expand a product in ascending powers and keep only requested terms.", "Use expansion rules and simplify relevant coefficients.", ["pure 3", "series", "expansion"], june2024.paper31),
  createQuestion("9709-2024-mj-31-q4", "31", "pure", "Paper 3 Pure Mathematics 3", "4", "Complex numbers in polar form", "Complex numbers", "Convert and combine complex numbers in modulus-argument form.", "Credit modulus, argument, polar operations, and angle range.", ["complex numbers", "polar form"], june2024.paper31),
  createQuestion("9709-2024-mj-41-q1", "41", "mechanics", "Paper 4 Mechanics", "1", "Velocity-time graph and distance", "Kinematics", "Sketch staged motion and calculate distance from areas under the graph.", "Use correct graph sections and area calculations.", ["mechanics", "kinematics", "velocity time graph"], june2024.paper41),
  createQuestion("9709-2024-mj-41-q2", "41", "mechanics", "Paper 4 Mechanics", "2", "Resultant force components", "Forces", "Resolve forces, apply a zero-component condition, and calculate resultant.", "Credit component equations, vector addition, magnitude, and direction.", ["mechanics", "forces", "components"], june2024.paper41),
  createQuestion("9709-2024-mj-51-q1", "51", "statistics", "Paper 5 Probability & Statistics 1", "1", "Combined mean and standard deviation", "Data summaries", "Combine summary statistics to find overall mean and standard deviation.", "Combine totals and use variance formula consistently.", ["statistics", "mean", "standard deviation"], june2024.paper51),
  createQuestion("9709-2024-mj-51-q3", "51", "statistics", "Paper 5 Probability & Statistics 1", "3", "Histogram and interquartile range", "Grouped data", "Use grouped frequency data for a histogram and quartile reasoning.", "Credit frequency density, bars, and cumulative-frequency quartiles.", ["histogram", "grouped data", "interquartile range"], june2024.paper51),
  createQuestion("9709-2024-mj-61-q1", "61", "statistics", "Paper 6 Probability & Statistics 2", "1", "Combined Poisson model", "Poisson distribution", "Combine independent Poisson rates over a changed time interval.", "Combine means, scale time, and use tail probability correctly.", ["poisson", "independent", "probability"], june2024.paper61),
  createQuestion("9709-2024-mj-61-q3", "61", "statistics", "Paper 6 Probability & Statistics 2", "3", "Confidence interval interpretation", "Confidence intervals", "Calculate and interpret a confidence interval.", "Use interval formula and explain the confidence level correctly.", ["confidence interval", "normal", "statistics"], june2024.paper61),
];

function createQuestion(id, componentCode, componentGroup, paperLabel, questionNumber, title, topic, questionSummary, markSchemeSummary, tags, links) {
  return {
    ...baseQuestion,
    id,
    componentCode,
    componentGroup,
    paperLabel,
    questionNumber,
    title,
    topic,
    questionSummary,
    markSchemeSummary,
    tags,
    questionPdf: links.questionPdf,
    markSchemePdf: links.markSchemePdf,
  };
}

module.exports = {
  cieMathQuestionBank,
};
