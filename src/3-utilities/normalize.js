function replaceAndNormalizeSpaces(str) {
    // Replace `+-+`, `+`, and `-` with a space
    let result = str.replace(/\+-\+|\+|-/g, ' ');
    
    // Replace multiple spaces with a single space
    result = result.replace(/\s+/g, ' ').trim();

    return result;
}

export default replaceAndNormalizeSpaces;