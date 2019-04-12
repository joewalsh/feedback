require('dotenv').config();

const https = require('https');
const iosAppID = process.env.IOS_APP_ID || '324715238';
const natural = require('natural');
const path = require('path');
 
const base_folder = path.join(path.dirname(require.resolve('natural')), 'brill_pos_tagger');
const rulesFilename = base_folder + '/data/English/tr_from_posjs.txt';
const lexiconFilename = base_folder + '/data/English/lexicon_from_posjs.json';
const defaultCategory = 'N';
 
const lexicon = new natural.Lexicon(lexiconFilename, defaultCategory);
const rules = new natural.RuleSet(rulesFilename);
const tagger = new natural.BrillPOSTagger(lexicon, rules);

const sortedWords = (words) => {
  const keys = Object.keys(words);
  var keyValues = []
  keys.forEach((key) => {
    keyValues.push([key, words[key]])
  });
  keyValues.sort((a, b) => {
    return a[1] - b[1];
  });
  return JSON.stringify(keyValues);
};

const ignoredWords = {
  "wikipedia": 1, 
  "app": 1,
  "one": 1,
  "use": 1,
  "have": 1,
  "has": 1,
  "was": 1,
  "are": 1,
  "been": 1,
  "being": 1,
  "ios": 1,
  "apps": 1,
  "i've": 1,
  "i'd": 1,
  "isn't": 1,
  "i'm": 1,
  "wiki": 1
};

const handleEntries = async (entries) => {
  var positiveWords = [];
  var negativeWords = [];
  entries.forEach((entry) => {
    const sentences = entry.content.label.split(/[!:;,.?]+[\s]*/);
    const rating = entry['im:rating'].label;
    const ratingInteger = parseInt(rating);
    sentences.forEach((sentence) => {
      const tokenizedSentence = sentence.split(/[\s\d]/);
      const taggedSentence = tagger.tag(tokenizedSentence);
      //console.log(JSON.stringify(taggedSentence));
      taggedSentence.taggedWords.forEach((taggedWord) => {
        const word = taggedWord.token.toLowerCase();
        if (word.length < 3 || ignoredWords[word]) {
          return;
        }
        if (taggedWord.tag.startsWith("NN") || taggedWord.tag.startsWith("VB") || taggedWord.tag.startsWith("JJ")) {
          var words;
          if (ratingInteger > 3) {
            positiveWords.push(word)
          } else {
            negativeWords.push(word)
            //words = negativeWords;
          }
          //words[word] = (words[word] || 0) + 1
        }
      });
    });
  });
  console.log("=== 4-5 star reviews ===");
  console.log(JSON.stringify(positiveWords));
  console.log("=== 1-3 star reviews ===");
  console.log(JSON.stringify(negativeWords));
};



const country = 'us';
var allEntries = []
var responseCount = 0;
var pageCount = 10;
var page;
for (page = 1; page <= pageCount; page++) { 
  const appStoreReviewURL = `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${iosAppID}/sortBy=mostRecent/json`
  https.get(appStoreReviewURL, function(res){
      var body = '';

      res.on('data', async (chunk) => {
          body += chunk;
      });

      res.on('end', async () => {
          var response = JSON.parse(body);
          var feed = response.feed;
          if (!feed) {
            return;
          }
          var entries = feed.entry;
          if (!entries) {
            return;
          }
          allEntries = allEntries.concat(entries);
          responseCount++;
          if (responseCount == pageCount) {
            handleEntries(allEntries);
          }
      });
  }).on('error', function(e){
      console.log("Got an error: ", e);
      responseCount++;
      if (responseCount == pageCount) {
        handleEntries(allEntries);
      }
  });
}  
