import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import { questions } from './questions.js';

let totalScore = 0;
let currentQuestionIndex = 0;

function displayWelcome() {
    console.clear();
    console.log(
        chalk.yellow(
            figlet.textSync('PC Quiz!', { horizontalLayout: 'full' })
        )
    );
    console.log(chalk.blue('\nДобро пожаловать в викторину о компьютерах!\n'));
}

async function askQuestion(question) {
    const timer = question.time;
    let timeLeft = timer;
    
    console.clear();
    console.log(chalk.yellow(`Вопрос ${currentQuestionIndex + 1} из ${questions.length}`));
    console.log(chalk.blue(`Очки за правильный ответ: ${question.points}`));
    console.log(chalk.green('\n' + question.question + '\n'));

    const timerInterval = setInterval(() => {
        process.stdout.write(`\rВремя: ${timeLeft} сек`);
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(timerInterval);
            console.log(chalk.red('\n\nВремя вышло!'));
            return null;
        }
    }, 1000);

    try {
        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'Выберите ответ:',
                choices: question.options,
                pageSize: 4
            }
        ]);

        clearInterval(timerInterval);
        return question.options.indexOf(answer.choice);
    } catch (error) {
        clearInterval(timerInterval);
        return null;
    }
}

async function showResult(userAnswer, question) {
    console.clear();
    if (userAnswer === null) {
        console.log(chalk.red('Время вышло! Очки не начислены.'));
    } else if (userAnswer === question.correctAnswer) {
        console.log(chalk.green('Правильно! 🎉'));
        totalScore += question.points;
    } else {
        console.log(chalk.red('Неправильно! 😢'));
        console.log(chalk.yellow(`Правильный ответ: ${question.options[question.correctAnswer]}`));
    }

    console.log(chalk.blue(`\nТекущий счет: ${totalScore}`));
    
    if (currentQuestionIndex < questions.length - 1) {
        const { continue: shouldContinue } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'continue',
                message: 'Готовы к следующему вопросу?',
                default: true
            }
        ]);

        if (shouldContinue) {
            currentQuestionIndex++;
            await playGame();
        }
    } else {
        await showFinalResults();
    }
}

async function showFinalResults() {
    console.clear();
    console.log(
        chalk.yellow(
            figlet.textSync('Game Over!', { horizontalLayout: 'full' })
        )
    );
    console.log(chalk.green(`\nПоздравляем! Вы завершили викторину!`));
    console.log(chalk.blue(`Итоговый счет: ${totalScore}`));
    console.log(chalk.yellow(`Максимально возможный счет: ${questions.reduce((sum, q) => sum + q.points, 0)}`));

    const { playAgain } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'playAgain',
            message: 'Хотите сыграть снова?',
            default: false
        }
    ]);

    if (playAgain) {
        totalScore = 0;
        currentQuestionIndex = 0;
        await startGame();
    } else {
        console.log(chalk.green('\nСпасибо за игру! До свидания! 👋'));
        process.exit(0);
    }
}

async function playGame() {
    const question = questions[currentQuestionIndex];
    const userAnswer = await askQuestion(question);
    await showResult(userAnswer, question);
}

async function startGame() {
    displayWelcome();
    
    const { ready } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'ready',
            message: 'Готовы начать игру?',
            default: true
        }
    ]);

    if (ready) {
        await playGame();
    } else {
        console.log(chalk.yellow('До свидания! 👋'));
        process.exit(0);
    }
}

startGame().catch(console.error); 