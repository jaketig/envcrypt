const readline = require('readline');


module.exports = async (question) => {
  return await new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    })
  });
}