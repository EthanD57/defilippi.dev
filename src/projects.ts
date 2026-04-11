//Little logos next to the file names
import type {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import { faPython, faJs } from '@fortawesome/free-brands-svg-icons';

export { faPython, faJs };

// Define what a single code file looks like
export interface ProjectFile {
    name: string;
    language: string;
    icon: IconDefinition;
    content: string;
}

// Define what a full Project looks like
export interface Project {
    id: string;
    title: string;
    description: string;
    files: ProjectFile[];
    iframeUrl: string;
}

export const projects: Project[] = [
    {
        id: 'project-1',
        title: 'ML & Algorithmic Implementations For Solving Wordle',
        description: 'Different Implementations for Solving Wordle Using ML and Classic Algorithmic Approach.',
        iframeUrl: 'https://example.com/demo1',
        files: [
            {
                name: 'main.py',
                language: 'python',
                icon: faPython,
                content: 'import time\n' +
                    'from pathlib import Path\n' +
                    'from random import choice\n' +
                    'import wordle\n' +
                    'from multiprocessing import Pool\n' +
                    'import click\n' +
                    '\n' +
                    'from Utilities.data_collector import TrainingDataCollector\n' +
                    'from Utilities.shared_utils import filter_words, score_guess, calculate_entropy_pattern_table\n' +
                    'from ML import (entropy_maximization_bot, random_forest_classifier,\n' +
                    '                random_forest_regressor, deep_q_network, neural_network_classifier)\n' +
                    'from Utilities import display\n' +
                    '\n' +
                    'TESTING_MODE = False\n' +
                    '\n' +
                    'worker_pattern_table = None\n' +
                    'model_options = ["Entropy Maximization", "Random Forest Classifier", "Random Forest Regressor",\n' +
                    '                 "Neural Network Classifier", "Deep Q-Network"]\n' +
                    '\n' +
                    '\n' +
                    'def _startup(game_instance: wordle.Wordle):\n' +
                    '    """\n' +
                    '    Initialize The Wordle Game According to User Input\n' +
                    '    The User Has the Option to Choose a Word or Have one\n' +
                    '    Randomly be Decided.\n' +
                    '\n' +
                    '    Args:\n' +
                    '        game_instance: Wordle instance\n' +
                    '\n' +
                    '    Returns:\n' +
                    '        None\n' +
                    '\n' +
                    '    """\n' +
                    '    model = 1\n' +
                    '    while True:\n' +
                    '        display.print_menu(model, model_options)\n' +
                    '        usr_input = click.prompt("Please Choose an Option", type=click.Choice(["1", "2", "3", "4", "5", "q"]),\n' +
                    '                                 show_choices=False)\n' +
                    '        if usr_input == "1":  #User-Chosen Word\n' +
                    '            usr_word = _handle_user_word(game_instance)\n' +
                    '            print(_play_game(game_instance, model, usr_word))\n' +
                    '        elif usr_input == "2":  #Random Word\n' +
                    '            rnd_word = _rand_word(game_instance.word_list)\n' +
                    '            print(_play_game(game_instance, model, rnd_word))\n' +
                    '        elif usr_input == "3":  #Test the Model/Bot\n' +
                    '            global TESTING_MODE\n' +
                    '            TESTING_MODE = True\n' +
                    '            testing_range = click.prompt("Enter the Number of Tests You Would Like to Run",\n' +
                    '                                         type=click.IntRange(1, ), show_choices=False)\n' +
                    '            if model < 4:\n' +
                    '                processes = click.prompt("How Many Parallel Processes Should be Used",\n' +
                    '                                         type=click.IntRange(1, 20), show_choices=True)\n' +
                    '                _test_bot(game_instance, testing_range, processes, model)\n' +
                    '\n' +
                    '            else: _test_non_parallel_models(game_instance, testing_range, model)\n' +
                    '            print("Testing Complete! Returning To Main Menu...")\n' +
                    '        elif usr_input == "4":  #Collect Training Data\n' +
                    '            testing_range = click.prompt("Enter the Number of Games to Collect Data From",\n' +
                    '                                         type=click.IntRange(1, ), show_choices=False)\n' +
                    '            processes = click.prompt("How Many Parallel Processes Should be Used",\n' +
                    '                                     type=click.IntRange(1, 20), show_choices=True)\n' +
                    '            _gather_testing_data(game_instance, testing_range, processes)\n' +
                    '            print("Training Data Collected! Returning To Main Menu...")\n' +
                    '        elif usr_input == "5":  #Choose Model/Bot to Use\n' +
                    '            print("Model Options:\\n"\n' +
                    '                  "1. Entropy Maximization\\n"\n' +
                    '                  "2. Random Forest Classifier\\n"\n' +
                    '                  "3. Random Forest Regressor\\n"\n' +
                    '                  "4. Neural Network Classifier\\n"\n' +
                    '                  "5. Deep Q-Network\\n")\n' +
                    '            model = click.prompt("Enter the Model You Would Like to Use",\n' +
                    '                                 type=click.IntRange(1, 5), show_choices=False)\n' +
                    '        elif usr_input == \'q\':\n' +
                    '            exit()\n' +
                    '        else:\n' +
                    '            continue\n' +
                    '\n' +
                    '\n' +
                    'def _handle_user_word(instance: wordle.Wordle):\n' +
                    '    """\n' +
                    '    Takes In User Input for Word Selection and\n' +
                    '    Ensures it is 5 Characters Long\n' +
                    '\n' +
                    '    Args:\n' +
                    '        instance (wordle.Wordle): The game instance to pull the word list from\n' +
                    '\n' +
                    '    Returns:\n' +
                    '        str: The word chosen by the user\n' +
                    '\n' +
                    '    """\n' +
                    '    while True:\n' +
                    '        word = click.prompt("Please Enter a 5-Character String or Enter \'q\' to Exit", type=str)\n' +
                    '        if word == "q":\n' +
                    '            exit()\n' +
                    '        elif len(word) > 5 or len(word) < 5:\n' +
                    '            continue\n' +
                    '        elif word in instance.word_list:\n' +
                    '            return word\n' +
                    '        else:\n' +
                    '            instance.word_list.append(word)\n' +
                    '            instance.needRecompute = True\n' +
                    '            return word\n' +
                    '\n' +
                    '\n' +
                    'def _rand_word(words: list[str]):\n' +
                    '    """\n' +
                    '    Returns a Random Word From The Word List\n' +
                    '\n' +
                    '    Args:\n' +
                    '        words (list[str]): A list containing all valid words for the game\n' +
                    '\n' +
                    '    Returns:\n' +
                    '        str: The randomly chosen word\n' +
                    '\n' +
                    '    """\n' +
                    '    word = choice(tuple(words))\n' +
                    '    if not TESTING_MODE: print(f"Random Word Chosen is {word}")\n' +
                    '    return word\n' +
                    '\n' +
                    '\n' +
                    'def _play_game(game_instance: wordle.Wordle, model: int, word=""):\n' +
                    '    """\n' +
                    '    The Main Game Loop Logic.\n' +
                    '    The Bot Plays the Game and the Results of Each\n' +
                    '    Round is Shown in The Console For the\n' +
                    '    User to Follow Along.\n' +
                    '\n' +
                    '    Args:\n' +
                    '\n' +
                    '    Returns:\n' +
                    '        None\n' +
                    '\n' +
                    '    """\n' +
                    '\n' +
                    '    display.print_game_start()\n' +
                    '    bot = initialize_bot(game_instance, model)\n' +
                    '\n' +
                    '    guess_count = 0\n' +
                    '    guesses = []\n' +
                    '    while guess_count < 6:\n' +
                    '        guess = bot.make_guess()\n' +
                    '        if guess == word:  ##Correct Word Guessed\n' +
                    '            guess_count += 1\n' +
                    '            guesses.append([guess, score_guess(word, guess)])\n' +
                    '            display.print_game_state(guesses)\n' +
                    '            display.print_end_screen(word, guess_count)\n' +
                    '            return ""\n' +
                    '        else:  ##Incorrect Word Guessed. Update Game State and Send Score\n' +
                    '            score = score_guess(word, guess)\n' +
                    '            guesses.append([guess, score])\n' +
                    '            ##Give the Bot Its Score for the Round\n' +
                    '            filter_words(guess, score, bot.game_state)\n' +
                    '            guess_count += 1\n' +
                    '        display.print_game_state(guesses)\n' +
                    '    return "Word Not Guessed :("\n' +
                    '\n' +
                    '\n' +
                    'def init_worker(pattern_table):\n' +
                    '    global worker_pattern_table\n' +
                    '    worker_pattern_table = pattern_table\n' +
                    '\n' +
                    '\n' +
                    'def _test_bot(game_instance: wordle.Wordle, testing_runs: int, processes=2, model: int = 1):\n' +
                    '    correct_games = 0\n' +
                    '    incorrect_games = 0\n' +
                    '    guess_counts = []\n' +
                    '    pattern_table = None\n' +
                    '\n' +
                    '    if model != 1:\n' +
                    '        initialize_bot(game_instance, model)\n' +
                    '    else:\n' +
                    '        pattern_table = get_pattern_table(game_instance)\n' +
                    '\n' +
                    '    with Pool(processes, initializer=init_worker, initargs=(pattern_table,)) as pool:\n' +
                    '        args = [(_rand_word(game_instance.word_list), game_instance.word_list, model) for _ in range(testing_runs)]\n' +
                    '        results = pool.map(_run_single_game, args)\n' +
                    '        for result in results:\n' +
                    '            if result > 5:\n' +
                    '                incorrect_games += 1\n' +
                    '            else:\n' +
                    '                correct_games += 1\n' +
                    '                guess_counts.append(result)\n' +
                    '    print(f"\\n\\nCorrect Games Percentage: {round((correct_games / testing_runs) * 100, 2)}%")\n' +
                    '    print(f"Incorrect Games Percentage: {round((incorrect_games / testing_runs) * 100, 2)}%")\n' +
                    '    print("Average Number of Guesses: ", round(sum(guess_counts) / len(guess_counts), 2))\n' +
                    '\n' +
                    'def _test_non_parallel_models(game_instance: wordle.Wordle, testing_runs: int, model: int = 1):\n' +
                    '    correct_games = 0\n' +
                    '    incorrect_games = 0\n' +
                    '    guess_counts = []\n' +
                    '    if model != 1: initialize_bot(game_instance, model)\n' +
                    '    for i in range(testing_runs):\n' +
                    '        guess_count = _run_single_game((_rand_word(game_instance.word_list), game_instance.word_list, model))\n' +
                    '        if guess_count < 6:\n' +
                    '            guess_counts.append(guess_count)\n' +
                    '            correct_games += 1\n' +
                    '        else:\n' +
                    '            incorrect_games += 1\n' +
                    '    print(f"\\n\\nCorrect Games Percentage: {round((correct_games / testing_runs) * 100, 2)}%")\n' +
                    '    print(f"Incorrect Games Percentage: {round((incorrect_games / testing_runs) * 100, 2)}%")\n' +
                    '    print("Average Number of Guesses: ", round(sum(guess_counts) / len(guess_counts), 2))\n' +
                    '\n' +
                    'def _run_single_game(args):\n' +
                    '    word, word_list, model = args\n' +
                    '\n' +
                    '    if model == 1:\n' +
                    '        bot = entropy_maximization_bot.EntropyBot(word_list, worker_pattern_table)\n' +
                    '    elif model == 2:\n' +
                    '        bot = random_forest_classifier.RandomForestClassifierModel(word_list)\n' +
                    '    elif model == 3:\n' +
                    '        bot = random_forest_regressor.RandomForestRegressorModel(word_list)\n' +
                    '    elif model == 4:  #Should NEVER get here\n' +
                    '        bot = neural_network_classifier.NeuralNetworkClassifier(word_list)\n' +
                    '    else:\n' +
                    '        bot = deep_q_network.DQNBot(word_list)\n' +
                    '\n' +
                    '    if model != 1 and not bot.is_trained: bot.train()\n' +
                    '    guess_count = 0\n' +
                    '    while guess_count < 6:\n' +
                    '        guess = bot.make_guess()\n' +
                    '        if guess == word:\n' +
                    '            return guess_count\n' +
                    '        score = score_guess(word, guess)\n' +
                    '        filter_words(guess, score, bot.game_state)\n' +
                    '        guess_count += 1\n' +
                    '    return guess_count\n' +
                    '\n' +
                    '\n' +
                    'def _gather_testing_data(game_instance: wordle.Wordle, game_count, process_count):\n' +
                    '    pattern_table = get_pattern_table(game_instance)\n' +
                    '    collector = TrainingDataCollector(game_instance.word_list, pattern_table)\n' +
                    '\n' +
                    '    start_time = time.time()\n' +
                    '    print(f"Collecting data from {game_count} games...")\n' +
                    '    collector.collect_training_data_parallel(num_games=game_count, k=10, processes=process_count)\n' +
                    '    stop_time = time.time()\n' +
                    '\n' +
                    '    print(f"Time taken: {stop_time - start_time}")\n' +
                    '    print(f"Collected {len(collector.training_data)} training examples")\n' +
                    '    print(f"Feature shape: {collector.training_data[0][0].shape}")\n' +
                    '    print(f"Label shape: {collector.training_data[0][1].shape}")\n' +
                    '\n' +
                    '\n' +
                    'def get_pattern_table(game_instance: wordle.Wordle):\n' +
                    '    global worker_pattern_table\n' +
                    '    if worker_pattern_table is None or game_instance.needRecompute:\n' +
                    '        pattern_table = calculate_entropy_pattern_table(game_instance.word_list)\n' +
                    '        worker_pattern_table = pattern_table\n' +
                    '        game_instance.needRecompute = False\n' +
                    '        return pattern_table\n' +
                    '    else:\n' +
                    '        return worker_pattern_table\n' +
                    '\n' +
                    '\n' +
                    'def initialize_bot(game_instance: wordle.Wordle, model: int = 1):\n' +
                    '    if model == 1:\n' +
                    '        return entropy_maximization_bot.EntropyBot(game_instance.word_list, get_pattern_table(game_instance))\n' +
                    '    elif model == 2:\n' +
                    '        bot = random_forest_classifier.RandomForestClassifierModel(game_instance.word_list)\n' +
                    '        bot.train()\n' +
                    '        return bot\n' +
                    '    elif model == 3:\n' +
                    '        bot = random_forest_regressor.RandomForestRegressorModel(game_instance.word_list)\n' +
                    '        bot.train()\n' +
                    '        return bot\n' +
                    '    elif model == 4:\n' +
                    '        bot = neural_network_classifier.NeuralNetworkClassifier(game_instance.word_list)\n' +
                    '        bot.train()\n' +
                    '    else:\n' +
                    '        bot = deep_q_network.DQNBot(game_instance.word_list)\n' +
                    '        bot.train()\n' +
                    '    return bot\n' +
                    '\n' +
                    '\n' +
                    'if __name__ == \'__main__\':\n' +
                    '    word_list_path = Path("words.txt")\n' +
                    '    game = wordle.Wordle(word_list_path)\n' +
                    '    print(f"Successfully Loaded {len(game.word_list)} Words Into The Game!\\n\\n")\n' +
                    '    _startup(game)\n'
            },
            {
                name: 'wordle.py',
                language: 'python',
                icon: faPython,
                content: 'from pathlib import Path\n' +
                    '\n' +
                    'class Wordle:\n' +
                    '    def __init__(self, filepath: Path) -> None:\n' +
                    '        try:\n' +
                    '            with open(filepath, "r", encoding="utf-8") as f:\n' +
                    '                self.word_list = list(line.strip() for line in f)\n' +
                    '        except FileNotFoundError:\n' +
                    '            print("Error: \'words.txt\' not found. Please ensure the word list file is in the correct directory.")\n' +
                    '            exit()\n' +
                    '        except Exception as e:\n' +
                    '            print(f"An unexpected error occurred while loading words.txt: {e}")\n' +
                    '            exit()\n' +
                    '\n' +
                    '        self.needRecompute = True\n' +
                    '\n'
            }
        ]
    },
    {
        id: 'project-2',
        title: 'Cloud Dashboard',
        description: 'Real-time monitoring interface.',
        iframeUrl: 'https://example.com/demo2',
        files: [
            {
                name: 'App.js',
                language: 'javascript',
                icon: faJs,
                content: 'const Dashboard = () => "Hello World";'
            }
        ]
    }
];