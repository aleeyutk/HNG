class APIError extends Error {
    constructor(message) {
        super(message);
        this.status = 502;
    }
}

async function enrichProfile(name) {
    const [genderRes, agifyRes, nationalizeRes] = await Promise.all([
        fetch(`https://api.genderize.io?name=${encodeURIComponent(name)}`),
        fetch(`https://api.agify.io?name=${encodeURIComponent(name)}`),
        fetch(`https://api.nationalize.io?name=${encodeURIComponent(name)}`)
    ]);

    if (!genderRes.ok) throw new APIError('Genderize returned an invalid response');
    if (!agifyRes.ok) throw new APIError('Agify returned an invalid response');
    if (!nationalizeRes.ok) throw new APIError('Nationalize returned an invalid response');

    const genderData = await genderRes.json();
    const agifyData = await agifyRes.json();
    const nationalizeData = await nationalizeRes.json();

    if (genderData.gender === null || genderData.count === 0) {
        throw new APIError('Genderize returned an invalid response');
    }
    if (agifyData.age === null) {
        throw new APIError('Agify returned an invalid response');
    }
    if (!nationalizeData.country || nationalizeData.country.length === 0) {
        throw new APIError('Nationalize returned an invalid response');
    }

    let age_group;
    if (agifyData.age <= 12) age_group = "child";
    else if (agifyData.age <= 19) age_group = "teenager";
    else if (agifyData.age <= 59) age_group = "adult";
    else age_group = "senior";

    let highestProbCountry = nationalizeData.country[0];
    for (const c of nationalizeData.country) {
        if (c.probability > highestProbCountry.probability) {
            highestProbCountry = c;
        }
    }

    return {
        gender: genderData.gender,
        gender_probability: genderData.probability,
        sample_size: genderData.count,
        age: agifyData.age,
        age_group,
        country_id: highestProbCountry.country_id,
        country_probability: highestProbCountry.probability
    };
}

module.exports = { enrichProfile, APIError };
