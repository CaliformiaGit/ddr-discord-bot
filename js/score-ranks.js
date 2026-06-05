const scoreRankEmojis = {
    "AAA": "<:rank_aaa:1510919746705690676>",
    "AA+": "<:rank_aa_plus:1510919772718760068>",
    "AA": "<:rank_aa:1510919770256576533>",
    "AA-": "<:rank_aa_minus:1510919768201232544>",
    "A+": "<:rank_a_plus:1510919764485214248>",
    "A": "<:rank_a:1510919762488590386>",
    "A-": "<:rank_a_minus:1510919765957415083>",
    "B+": "<:rank_b_plus:1510919760802742352>",
    "B": "<:rank_b:1510919756008525887>",
    "B-": "<:rank_b_minus:1510919758424572056>",
    "C+": "<:rank_c_plus:1510919752414138418>",
    "C": "<:rank_c:1510919750690279524>",
    "C-": "<:rank_c_minus:1510919754309701743>",
    "D+": "<:rank_d_plus:1510919742565781645>",
    "D": "<:rank_d:1510919740695117914>",
    "E": "<:rank_e:1510919744746819685>"
};

function getScoreGrade(score) {
    if (score >= 990000) return "AAA";
    if (score >= 950000) return "AA+";
    if (score >= 900000) return "AA";
    if (score >= 890000) return "AA-";
    if (score >= 850000) return "A+";
    if (score >= 800000) return "A";
    if (score >= 790000) return "A-";
    if (score >= 750000) return "B+";
    if (score >= 700000) return "B";
    if (score >= 690000) return "B-";
    if (score >= 650000) return "C+";
    if (score >= 600000) return "C";
    if (score >= 590000) return "C-";
    if (score >= 550000) return "D+";
    return "D";
}

module.exports = {
    scoreRankEmojis,
    getScoreGrade
};