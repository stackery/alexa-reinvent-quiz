/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  no-restricted-syntax */

// IMPORTANT: Please note that this template uses Dispay Directives,
// Display Interface for your skill should be enabled through the Amazon developer console
// See this screenshot - https://alexa.design/enabledisplay

const Alexa = require('ask-sdk-core');

/* INTENT HANDLERS */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === `LaunchRequest`;
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(welcomeMessage)
      .reprompt(helpMessage)
      .getResponse();
  },
};

const QuizHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Inside QuizHandler");
    console.log(JSON.stringify(request));
    return request.type === "IntentRequest" &&
           (request.intent.name === "QuizIntent" || request.intent.name === "AMAZON.StartOverIntent");
  },
  handle(handlerInput) {
    console.log("Inside QuizHandler - handle");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const response = handlerInput.responseBuilder;
    attributes.state = states.QUIZ;
    attributes.counter = 0;
    attributes.quizScore = 0;

    var question = askQuestion(handlerInput);
    var speakOutput = startQuizMessage + question;
    var repromptOutput = question;

    const item = attributes.quizItem;
    const property = attributes.quizProperty;

    if (supportsDisplay(handlerInput)) {
      const title = `Question #${attributes.counter}`;
      const primaryText = new Alexa.RichTextContentHelper().withPrimaryText(getQuestionWithoutOrdinal(property, item)).getTextContent();
      const backgroundImage = new Alexa.ImageHelper().addImageInstance(getBackgroundImage());
      const itemList = [];
      getAndShuffleMultipleChoiceAnswers(attributes.selectedItemIndex, item, property).forEach((x, i) => {
        itemList.push(
          {
            "token" : x,
            "textContent" : new Alexa.PlainTextContentHelper().withPrimaryText(x).getTextContent(),
          }
        );
      });
      response.addRenderTemplateDirective({
        type : 'ListTemplate1',
        token : 'Question',
        backButton : 'hidden',
        backgroundImage,
        title,
        listItems : itemList,
      });
    }

    return response.speak(speakOutput)
                   .reprompt(repromptOutput)
                   .getResponse();
  },
};

const DefinitionHandler = {
  canHandle(handlerInput) {
    console.log("Inside DefinitionHandler");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;

    return attributes.state !== states.QUIZ &&
           request.type === 'IntentRequest' &&
           request.intent.name === 'AnswerIntent';
  },
  handle(handlerInput) {
    console.log("Inside DefinitionHandler - handle");
    //GRABBING ALL SLOT VALUES AND RETURNING THE MATCHING DATA OBJECT.
    const item = getItem(handlerInput.requestEnvelope.request.intent.slots);
    const response = handlerInput.responseBuilder;

    //IF THE DATA WAS FOUND
    if (item && item[Object.getOwnPropertyNames(data[0])[0]] !== undefined) {
      if (useCardsFlag) {
        response.withStandardCard(
          getCardTitle(item),
          getTextDescription(item),
          getSmallImage(),
          getLargeImage())
      }

      if(supportsDisplay(handlerInput)) {
        const image = new Alexa.ImageHelper().addImageInstance(getLargeImage());
        const title = getCardTitle(item);
        const primaryText = new Alexa.RichTextContentHelper().withPrimaryText(getTextDescription(item, "<br/>")).getTextContent();
        response.addRenderTemplateDirective({
          type: 'BodyTemplate2',
          backButton: 'visible',
          image,
          title,
          textContent: primaryText,
        });
      }
      return response.speak(getSpeechDescription(item))
              .reprompt(repromptSpeech)
              .getResponse();
    }
    //IF THE DATA WAS NOT FOUND
    else
    {
      return response.speak(getBadAnswer(item))
              .reprompt(getBadAnswer(item))
              .getResponse();
    }
  }
};

const QuizAnswerHandler = {
  canHandle(handlerInput) {
    console.log("Inside QuizAnswerHandler");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;

    return attributes.state === states.QUIZ &&
           request.type === 'IntentRequest' &&
           request.intent.name === 'AnswerIntent';
  },
  handle(handlerInput) {
    console.log("Inside QuizAnswerHandler - handle");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const response = handlerInput.responseBuilder;

    var speakOutput = ``;
    var repromptOutput = ``;
    const item = attributes.quizItem;
    const property = attributes.quizProperty;
    const isCorrect = compareSlots(handlerInput.requestEnvelope.request.intent.slots, item[property]);

    if (isCorrect) {
      speakOutput = getSpeechCon(true);
      attributes.quizScore += 1;
      handlerInput.attributesManager.setSessionAttributes(attributes);
    } else {
      speakOutput = getSpeechCon(false);
    }

    speakOutput += getAnswer(property, item);
    var question = ``;
    //IF YOUR QUESTION COUNT IS LESS THAN 10, WE NEED TO ASK ANOTHER QUESTION.
    if (attributes.counter < 10) {
      speakOutput += getCurrentScore(attributes.quizScore, attributes.counter);
      question = askQuestion(handlerInput);
      speakOutput += question;
      repromptOutput = question;

      if (supportsDisplay(handlerInput)) {
        const title = `Question #${attributes.counter}`;
        const primaryText = new Alexa.RichTextContentHelper().withPrimaryText(getQuestionWithoutOrdinal(attributes.quizProperty, attributes.quizItem)).getTextContent();
        const backgroundImage = new Alexa.ImageHelper().addImageInstance(getBackgroundImage());
        const itemList = [];
        getAndShuffleMultipleChoiceAnswers(attributes.selectedItemIndex, attributes.quizItem, attributes.quizProperty).forEach((x, i) => {
          itemList.push(
            {
              "token" : x,
              "textContent" : new Alexa.PlainTextContentHelper().withPrimaryText(x).getTextContent(),
            }
          );
        });
        response.addRenderTemplateDirective({
          type : 'ListTemplate1',
          token : 'Question',
          backButton : 'hidden',
          backgroundImage,
          title,
          listItems : itemList,
        });
      }
      return response.speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
    }
    else {
      speakOutput += getFinalScore(attributes.quizScore, attributes.counter) + exitSkillMessage;
      if(supportsDisplay(handlerInput)) {
        const title = 'Thank you for playing';
        const primaryText = new Alexa.RichTextContentHelper().withPrimaryText(getFinalScore(attributes.quizScore, attributes.counter)).getTextContent();
        response.addRenderTemplateDirective({
          type : 'BodyTemplate1',
          backButton: 'hidden',
          title,
          textContent: primaryText,
        });
      }
      return response.speak(speakOutput).getResponse();
    }
  },
};

const RepeatHandler = {
  canHandle(handlerInput) {
    console.log("Inside RepeatHandler");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;

    return attributes.state === states.QUIZ &&
           request.type === 'IntentRequest' &&
           request.intent.name === 'AMAZON.RepeatHandler';
  },
  handle(handlerInput) {
    console.log("Inside RepeatHandler - handle");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const question = getQuestion(attributes.counter, attributes.quizproperty, attributes.quizitem);

    return handlerInput.responseBuilder
      .speak(question)
      .reprompt(question)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    console.log("Inside HelpHandler");
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
           request.intent.name === 'AMAZON.HelpHandler';
  },
  handle(handlerInput) {
    console.log("Inside HelpHandler - handle");
    return handlerInput.responseBuilder
      .speak(helpMessage)
      .reprompt(helpMessage)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    console.log("Inside ExitHandler");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;

    return request.type === `IntentRequest` && (
              request.intent.name === 'AMAZON.StopIntent' ||
              request.intent.name === 'AMAZON.PauseIntent' ||
              request.intent.name === 'AMAZON.CancelIntent'
           );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(exitSkillMessage)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    console.log("Inside SessionEndedRequestHandler");
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    console.log("Inside ErrorHandler");
    return true;
  },
  handle(handlerInput, error) {
    console.log("Inside ErrorHandler - handle");
    console.log(`Error handled: ${JSON.stringify(error)}`);
    console.log(`Handler Input: ${JSON.stringify(handlerInput)}`);

    return handlerInput.responseBuilder
      .speak(helpMessage)
      .reprompt(helpMessage)
      .getResponse();
  },
};

/* CONSTANTS */
const skillBuilder = Alexa.SkillBuilders.custom();
const imagePath = "";
const backgroundImagePath = ""
const speechConsCorrect = ['Booya', 'All righty', 'Bam', 'Bazinga', 'Bingo', 'Boom', 'Bravo', 'Cha Ching', 'Cheers', 'Dynomite', 'Hip hip hooray', 'Hurrah', 'Hurray', 'Huzzah', 'Oh dear.  Just kidding.  Hurray', 'Kaboom', 'Kaching', 'Oh snap', 'Phew','Righto', 'Way to go', 'Well done', 'Whee', 'Woo hoo', 'Yay', 'Wowza', 'Yowsa'];
const speechConsWrong = ['Argh', 'Aw man', 'Blarg', 'Blast', 'Boo', 'Bummer', 'Darn', "D'oh", 'Dun dun dun', 'Eek', 'Honk', 'Le sigh', 'Mamma mia', 'Oh boy', 'Oh dear', 'Oof', 'Ouch', 'Ruh roh', 'Shucks', 'Uh oh', 'Wah wah', 'Whoops a daisy', 'Yikes'];
const data = [
  {ServiceName: 'Simple Storage Service', ServiceType: 'Storage', LaunchDate: '20-0603', Abbreviation: 'S3'},
  {ServiceName: 'Simple Queue Service', ServiceType: 'Application Integration', LaunchDate: '2006-07', Abbreviation: 'SQS'},
  {ServiceName: 'SimpleDB', ServiceType: 'Database', LaunchDate: '2007-12', Abbreviation: 'SimpleDB'},
  {ServiceName: 'Elastic Block Store', ServiceType: 'Compute', LaunchDate: '2008-08', Abbreviation: 'EBS'},
  {ServiceName: 'Elastic Compute Cloud', ServiceType: 'Storage', LaunchDate: '2008-10', Abbreviation: 'EC2'},
  {ServiceName: 'Elastic Map Reduce', ServiceType: 'Analytics', LaunchDate: '2009-04', Abbreviation: 'EMR'},
  {ServiceName: 'CloudWatch', ServiceType: 'Management & Governance', LaunchDate: '2009-05', Abbreviation: 'No abbreviation, because the CW is a TV network, not an AWS service'},
  {ServiceName: 'Elastic Load Balancing', ServiceType: 'Networking & Content Delivery', LaunchDate: '2009-05', Abbreviation: 'ELB'},
  {ServiceName: 'Simple Notification Service', ServiceType: 'Application Integration', LaunchDate: '2010-04', Abbreviation: 'SNS'},
  {ServiceName: 'CloudFront', ServiceType: 'Networking & Content Delivery', LaunchDate: '2010-11', Abbreviation: 'No abbreviation here, just yet another service that starts with cloud'},
  {ServiceName: 'Route 53', ServiceType: 'Networking & Content Delivery', LaunchDate: '2010-12', Abbreviation: "No abbreviation. It's like Route 66, but with more traffic"},
  {ServiceName: 'Elastic Beanstalk', ServiceType: 'Compute', LaunchDate: '2011-01', Abbreviation: 'No abbreviation. Not the one Jack climbed'},
  {ServiceName: 'Simple Email Service', ServiceType: 'Application Integration', LaunchDate: '2011-01', Abbreviation: 'SES'},
  {ServiceName: 'CloudFormation', ServiceType: 'Management & Governance', LaunchDate: '2011-02', Abbreviation: 'No abbreviation here, just yet another service that starts with cloud'},
  {ServiceName: 'Identity & Access Management', ServiceType: 'Security, Identity & Compliance', LaunchDate: '2011-05', Abbreviation: 'No abbreviation, but I am so happy IAM exists'},
  {ServiceName: 'Virtual Public Cloud', ServiceType: 'Networking & Content Delivery', LaunchDate: '2011-08', Abbreviation: 'VPC'},
  {ServiceName: 'Direct Connect', ServiceType: 'Networking & Content Delivery', LaunchDate: '2011-08', Abbreviation: 'No abbreviation, just a direct connection.'},
  {ServiceName: 'ElastiCache', ServiceType: 'Database', LaunchDate: '2011-08', Abbreviation: 'No abbreviation here, just another elastic service. What are the odds?'},
  {ServiceName: 'DynamoDB', ServiceType: 'Database', LaunchDate: '2012-01', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'CloudSearch', ServiceType: 'Analytics', LaunchDate: '2012-04', Abbreviation: 'No abbreviation here, just yet another service that starts with cloud'},
  {ServiceName: 'Redshift', ServiceType: 'Database', LaunchDate: '2012-11', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'Relational Database', ServiceType: 'Database', LaunchDate: '2013-06', Abbreviation: 'RDS'},
  {ServiceName: 'CloudTrail', ServiceType: 'Management & Governance', LaunchDate: '2013-11', Abbreviation: 'No abbreviation here, just yet another service that starts with cloud'},
  {ServiceName: 'Kinesis', ServiceType: 'Analytics', LaunchDate: '2013-12', Abbreviation: "No abbreviation here, but it's a service that doesn't start with simple, who knew?"},
  {ServiceName: 'Cognito', ServiceType: 'Security, Identity & Compliance', LaunchDate: '2014-07', Abbreviation: "No abbreviation here, but there's no need to go incognito with Cognito"},
  {ServiceName: 'Lambda', ServiceType: 'Compute', LaunchDate: '2015-04', Abbreviation: 'No abbreviation here, just the little function that started it all'},
  {ServiceName: 'Elastic Container Service', ServiceType: 'Compute', LaunchDate: '2015-04', Abbreviation: 'ECS'},
  {ServiceName: 'API Gateway', ServiceType: 'Networking & Content Delivery', LaunchDate: '2015-07', Abbreviation: 'No abbreviation. Actually, I suppose API is an abbreviation'},
  {ServiceName: 'Elasticsearch Service', ServiceType: 'Analytics', LaunchDate: '2015-10', Abbreviation: 'No abbreviation here, just another elastic service. What are the odds?'},
  {ServiceName: 'Web Application Firewall', ServiceType: 'Security, Identity & Compliance', LaunchDate: '2015-10', Abbreviation: 'WAF'},
  {ServiceName: 'Elastic Container Registry', ServiceType: 'Compute', LaunchDate: '2015-12', Abbreviation: 'ECR'},
  {ServiceName: 'Elastic File System', ServiceType: 'Compute', LaunchDate: '2015-12', Abbreviation: 'EFS'},
  {ServiceName: 'Rekognition', ServiceType: 'Machine Learning', LaunchDate: '2016-11', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'Lightsail', ServiceType: 'Compute', LaunchDate: '2016-11', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'CodeBuild', ServiceType: 'Developer Tools', LaunchDate: '2016-12', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'Step Functions', ServiceType: 'Application Integration', LaunchDate: '2016-12', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'Amplify', ServiceType: 'Mobile', LaunchDate: '2017-11', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'Serverless Application Repository', ServiceType: 'Compute', LaunchDate: '2018-02', Abbreviation: 'SAR'},
  {ServiceName: 'Secrets Manager', ServiceType: 'Security, Identity & Compliance', LaunchDate: '2018-04', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'AppSync', ServiceType: 'Mobile', LaunchDate: '2018-04', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'Neptune', ServiceType: 'Database', LaunchDate: '2018-05', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'Elastic Kubernetes Service', ServiceType: 'Compute', LaunchDate: '2018-06', Abbreviation: 'EKS'},
  {ServiceName: 'Event Bridge', ServiceType: 'Application Integration', LaunchDate: '2019-07', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'Timestream', ServiceType: 'Database', LaunchDate: '2020-09', Abbreviation: 'No abbreviation here, but amazingly this service does not include the words cloud or elastic'},
  {ServiceName: 'reInvent', ServiceType: 'Conference', LaunchDate: '2012-03', Abbreviation: 'No abbreviation. Did you know that the first re:Invent only had 6,000 attendees, while the last one had 60,000. Talk about ten ex-ing!'}
];

const states = {
  START: `_START`,
  QUIZ: `_QUIZ`,
};

const welcomeMessage = `Welcome to the Stackery re:Invent Quiz Game!  You can ask me to tell you about a specific service, or you can ask me to start a quiz.  What would you like to do?`;
const startQuizMessage = `OK.  I will ask you 10 questions about AWS services. `;
const exitSkillMessage = `Thank you for playing the Stackery re:Invent Quiz Game!  Please come back whenever you need a break from watching re:Invent sessions!`;
const repromptSpeech = `Which AWS service would you like to know about?`;
const helpMessage = `I know lots of things about AWS.  They are my parents, after all! You can ask me to tell you about an AWS service, and I'll tell you what I know.  You can also test your knowledge by asking me to start a quiz.  What would you like to do?`;
const useCardsFlag = true;

/* HELPER FUNCTIONS */

// returns true if the skill is running on a device with a display (show|spot)
function supportsDisplay(handlerInput) {
  var hasDisplay =
    handlerInput.requestEnvelope.context &&
    handlerInput.requestEnvelope.context.System &&
    handlerInput.requestEnvelope.context.System.device &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display
  return hasDisplay;
}

function getBadAnswer(item) {
  return `I'm sorry. ${item} is not something I know very much about in this skill. ${helpMessage}`;
}

function getCurrentScore(score, counter) {
  return `Your current score is ${score} out of ${counter}. `;
}

function getFinalScore(score, counter) {
  return `Your final score is ${score} out of ${counter}. `;
}

function getCardTitle(item) {
  return item.ServiceName;
}

function getSmallImage() {
  return 'https://raw.githubusercontent.com/stackery/alexa-reinvent-quiz/master/src/img/alexa-reinvent-small.png';
}

function getLargeImage() {
  return 'https://raw.githubusercontent.com/stackery/alexa-reinvent-quiz/master/src/img/alexa-reinvent-large.png';
}

function convertDate(date) {
  const fixedDate = (date.split('-')[0] + ' ' + parseInt(date.split('-')[1],10)).toString();
  const newDate = new Date(fixedDate);

  return newDate.toLocaleString('en-us', { month: "long" }) + ' ' + newDate.getFullYear();
}

function getBackgroundImage() {
  return getLargeImage();
}

function getSpeechDescription(item) {
  if (item.Abbreviation.includes('No abbreviation')) {
    return `${item.ServiceName} is a ${item.ServiceType} service, first launched in ${convertDate(item.LaunchDate)}. ${item.Abbreviation}. I've added ${item.ServiceName} to your Alexa app.  Which other service would you like to know about?`;
  } else {
    return `${item.ServiceName} is a ${item.ServiceType} service, first launched in ${convertDate(item.LaunchDate)}. Its abbreviation is <say-as interpret-as='spell-out'>${item.Abbreviation}</say-as>. I've added ${item.ServiceName} to your Alexa app.  Which other service would you like to know about?`;
  }
}

function formatCasing(key) {
  return key.split(/(?=[A-Z])/).join(' ');
}

function getQuestion(counter, property, item) {
  return `Here is your ${counter}th question.  What is the ${formatCasing(property)} of ${item.ServiceName}?`;
}

// getQuestionWithoutOrdinal returns the question without the ordinal and is
// used for the echo show.
function getQuestionWithoutOrdinal(property, item) {
  return "What is the " + formatCasing(property).toLowerCase() + " of "  + item.ServiceName + "?";
}

function getAnswer(property, item) {
  switch (property) {
    case 'Abbreviation':
      if (item[property].includes('No abbreviation')) {
        return `${item[property]}. `;
      } else {
        return `The ${formatCasing(property)} of ${item.ServiceName} is <say-as interpret-as='spell-out'>${item[property]}</say-as>. `;
      }
      
    default:
      return `The ${formatCasing(property)} of ${item.ServiceName} is ${item[property]}. `;
  }
}

function getRandom(min, max) {
  return Math.floor((Math.random() * ((max - min) + 1)) + min);
}

function askQuestion(handlerInput) {
  console.log("I am in askQuestion()");
  //GENERATING THE RANDOM QUESTION FROM DATA
  const random = getRandom(0, data.length - 1);
  const item = data[random];
  const propertyArray = Object.getOwnPropertyNames(item);
  const property = propertyArray[getRandom(1, propertyArray.length - 1)];

  //GET SESSION ATTRIBUTES
  const attributes = handlerInput.attributesManager.getSessionAttributes();

  //SET QUESTION DATA TO ATTRIBUTES
  attributes.selectedItemIndex = random;
  attributes.quizItem = item;
  attributes.quizProperty = property;
  attributes.counter += 1;

  //SAVE ATTRIBUTES
  handlerInput.attributesManager.setSessionAttributes(attributes);

  const question = getQuestion(attributes.counter, property, item);
  return question;
}

function compareSlots(slots, value) {
  for (const slot in slots) {
    if (Object.prototype.hasOwnProperty.call(slots, slot) && slots[slot].value !== undefined) {
      // We want 'No abbreviation' to be a correct answer for items that start with 'No abbreviation'
      // rather than the whole snarky answer, so partial answers will be accepted
      if (value.toString().toLowerCase().contains(slots[slot].value.toString().toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

function getItem(slots) {
  const propertyArray = Object.getOwnPropertyNames(data[0]);
  let slotValue;

  for (const slot in slots) {
    if (Object.prototype.hasOwnProperty.call(slots, slot) && slots[slot].value !== undefined) {
      slotValue = slots[slot].value;
      for (const property in propertyArray) {
        if (Object.prototype.hasOwnProperty.call(propertyArray, property)) {
          const item = data.filter(x => x[propertyArray[property]]
            .toString().toLowerCase() === slots[slot].value.toString().toLowerCase());
          if (item.length > 0) {
            return item[0];
          }
        }
      }
    }
  }
  return slotValue;
}

function getSpeechCon(type) {
  if (type) return `<say-as interpret-as='interjection'>${speechConsCorrect[getRandom(0, speechConsCorrect.length - 1)]}! </say-as><break strength='strong'/>`;
  return `<say-as interpret-as='interjection'>${speechConsWrong[getRandom(0, speechConsWrong.length - 1)]} </say-as><break strength='strong'/>`;
}


function getTextDescription(item) {
  let text = '';

  for (const key in item) {
    if (Object.prototype.hasOwnProperty.call(item, key)) {
      text += `${formatCasing(key)}: ${item[key]}\n`;
    }
  }
  return text;
}

function getAndShuffleMultipleChoiceAnswers(currentIndex, item, property) {
  return shuffle(getMultipleChoiceAnswers(currentIndex, item, property));
}

// This function randomly chooses 3 answers 2 incorrect and 1 correct answer to
// display on the screen using the ListTemplate. It ensures that the list is unique.
function getMultipleChoiceAnswers(currentIndex, item, property) {

  // insert the correct answer first
  let answerList = [item[property]];

  // There's a possibility that we might get duplicate answers
  // to prevent duplicates we need avoid index collisions and take a sample of
  // 8 + 4 + 1 = 13 answers (it's not 8+4+3 because later we take the unique
  // we only need the minimum.)
  let count = 0
  let upperBound = 12

  let seen = new Array();
  seen[currentIndex] = 1;

  while (count < upperBound) {
    let random = getRandom(0, data.length - 1);

    // only add if we haven't seen this index
    if ( seen[random] === undefined ) {
      answerList.push(data[random][property]);
      count++;
    }
  }

  // remove duplicates from the list.
  answerList = answerList.filter((v, i, a) => a.indexOf(v) === i)
  // take the first three items from the list.
  answerList = answerList.slice(0, 3);
  return answerList;
}

// This function takes the contents of an array and randomly shuffles it.
function shuffle(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;

  while ( 0 !== currentIndex ) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

/* LAMBDA SETUP */
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    QuizHandler,
    DefinitionHandler,
    QuizAnswerHandler,
    RepeatHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
