//Little logos next to the file names
import type {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import { faPython, faJs } from '@fortawesome/free-brands-svg-icons';

export { faPython, faJs };

// Define what a single code file looks like
export interface ProjectFile {
    name: string;
    language: string;
    icon: IconDefinition;
    type: 'file'; // Distinguish between file and folder
    content: string;
}

export interface ProjectFolder {
    name: string;
    type: 'folder';
    children: (ProjectFile | ProjectFolder)[]; // Can contain both
}

// Define what a full Project looks like
export interface Project {
    id: string;
    title: string;
    description: string;
    files: (ProjectFile | ProjectFolder)[];
}

export const projects: Project[] = [
    {
        id: 'project-1',
        title: 'ML & Algorithmic Implementations For Solving Wordle',
        description: 'Different Implementations for Solving Wordle Using ML and Classic Algorithmic Approach.',
        files: [
            {
            name: 'ML',
            type: 'folder',
            children: [
                {
                    name: 'base_model.py',
                    language: 'python',
                    icon: faPython,
                    type: 'file',
                    content: 'import joblib\n' +
                        'from abc import ABC, abstractmethod\n' +
                        'from pathlib import Path\n' +
                        '\n' +
                        'import numpy as np\n' +
                        '\n' +
                        'from Utilities.game_state import GameState\n' +
                        'from Utilities.shared_utils import extract_features\n' +
                        '\n' +
                        '\n' +
                        'class BaseWordleModel(ABC):\n' +
                        '    """\n' +
                        '    Abstract base class for Wordle ML models.\n' +
                        '\n' +
                        '    All models must implement:\n' +
                        '    - train(): Learn from training data\n' +
                        '    - predict(): Make predictions on new game states\n' +
                        '\n' +
                        '    All models share:\n' +
                        '    - engineer_features(): Convert game state → feature vector\n' +
                        '    - save()/load(): Persistence with joblib\n' +
                        '    """\n' +
                        '\n' +
                        '    def __init__(self, model_name: str, word_list: list[str]) -> None:\n' +
                        '        self.model_name = model_name\n' +
                        '        self.is_trained = False\n' +
                        '        # Actual model (RandomForest, Neural Net, etc.) goes here\n' +
                        '        self._model = None\n' +
                        '        self.game_state = GameState(word_list)\n' +
                        '\n' +
                        '\n' +
                        '    @staticmethod\n' +
                        '    def engineer_features(game_state: GameState) -> np.ndarray:\n' +
                        '        """\n' +
                        '        Convert a game state into a feature vector.\n' +
                        '\n' +
                        '        This is the SAME for all models. If you change features,\n' +
                        '        you must retrain all models.\n' +
                        '\n' +
                        '        This method is ALWAYS called after filter_words() is called.\n' +
                        '\n' +
                        '        Args:\n' +
                        '            game_state (GameState): The current state of the game including remaining words,\n' +
                        '                                    guess count, and the master word list.\n' +
                        '\n' +
                        '        Returns:\n' +
                        '            np.ndarray: Shape (313,) with engineered features\n' +
                        '\n' +
                        '        Features include:\n' +
                        '        - Letter frequencies in remaining words\n' +
                        '        - Positional constraints (green/yellow/gray letters)\n' +
                        '        - Remaining word count\n' +
                        '        - Guess number\n' +
                        '        """\n' +
                        '\n' +
                        '        return extract_features(game_state)\n' +
                        '\n' +
                        '\n' +
                        '    @abstractmethod\n' +
                        '    def train(self) -> None:\n' +
                        '        """\n' +
                        '        Loads training data from the disk and trains the model off of it.\n' +
                        '        """\n' +
                        '        pass\n' +
                        '\n' +
                        '\n' +
                        '    @abstractmethod\n' +
                        '    def predict(self, game_state: GameState) -> np.ndarray:\n' +
                        '        """\n' +
                        '        Predict letter probabilities for a single game state.\n' +
                        '\n' +
                        '        Args:\n' +
                        '            game_state (GameState): The current state of the game\n' +
                        '\n' +
                        '        Returns:\n' +
                        '            np.ndarray: Shape (26,) with probabilities for letters A-Z\n' +
                        '                        probs[0] = P(letter \'A\' in next guess)\n' +
                        '                        probs[25] = P(letter \'Z\' in next guess)\n' +
                        '        """\n' +
                        '        pass\n' +
                        '\n' +
                        '\n' +
                        '    def make_guess(self) -> str:\n' +
                        '        """\n' +
                        '        This method houses the main logic for the bot to make a guess.\n' +
                        '\n' +
                        '        Returns:\n' +
                        '            str: The guessed answer\n' +
                        '\n' +
                        '        """\n' +
                        '        letter_probs = self.predict(self.game_state)\n' +
                        '        self.game_state.guess_count += 1\n' +
                        '\n' +
                        '        best_word = None\n' +
                        '        best_score = -1\n' +
                        '        remaining_count = len(self.game_state.remaining_words)\n' +
                        '\n' +
                        '        if remaining_count == 1: return self.game_state.remaining_words[0]\n' +
                        '\n' +
                        '        if remaining_count > 20:\n' +
                        '            candidate_pool = self.game_state.master_list\n' +
                        '        else:\n' +
                        '            candidate_pool = self.game_state.remaining_words\n' +
                        '\n' +
                        '        for word in candidate_pool:\n' +
                        '            score = sum(letter_probs[ord(letter) - ord(\'a\')] for letter in set(word))\n' +
                        '\n' +
                        '            # Prefer words that could actually be the answer\n' +
                        '            if word in self.game_state.remaining_words:\n' +
                        '                score += 0.01\n' +
                        '\n' +
                        '            if score > best_score:\n' +
                        '                best_word = word\n' +
                        '                best_score = score\n' +
                        '\n' +
                        '        return best_word\n' +
                        '\n' +
                        '\n' +
                        '    def save(self, filepath: Path, keep_game_state: bool) -> None:\n' +
                        '        """Save trained model to disk using joblib."""\n' +
                        '        if not self.is_trained:\n' +
                        '            raise ValueError("Cannot save untrained model")\n' +
                        '        if not keep_game_state: self.game_state.reset()\n' +
                        '        with open(filepath, \'wb\') as f:\n' +
                        '            joblib.dump(self, f)\n' +
                        '\n' +
                        '\n' +
                        '    @staticmethod\n' +
                        '    def load(filepath: Path) -> \'BaseWordleModel\':\n' +
                        '        """Load trained model from disk."""\n' +
                        '        with open(filepath, \'rb\') as f:\n' +
                        '            return joblib.load(f)\n' +
                        '\n' +
                        '\n' +
                        '\n' +
                        '\n'
                },
                {
                    name: 'deep_q_network.py',
                    language: 'python',
                    icon: faPython,
                    type: 'file',
                    content: 'from pathlib import Path\n' +
                        '\n' +
                        'import torch\n' +
                        'import torch.nn as nn\n' +
                        'import torch.optim as optim\n' +
                        'import numpy as np\n' +
                        'from collections import deque\n' +
                        'import random\n' +
                        '\n' +
                        'from Utilities.game_state import GameState\n' +
                        'from Utilities.shared_utils import extract_features, filter_words, score_guess\n' +
                        '\n' +
                        '\n' +
                        'def calculate_reward(won: bool, done: bool, guess_count: int,\n' +
                        '                     words_before: int, words_after: int) -> float:\n' +
                        '    """\n' +
                        '    Calculate reward for a guess.\n' +
                        '\n' +
                        '    Args:\n' +
                        '        won: Whether the game was won\n' +
                        '        done: Whether the episode is done or not\n' +
                        '        guess_count: Current guess number (1-6)\n' +
                        '        words_before: Number of possible words before guess\n' +
                        '        words_after: Number of possible words after guess\n' +
                        '\n' +
                        '    Returns:\n' +
                        '        float: The reward value\n' +
                        '    """\n' +
                        '    reward = 0.0\n' +
                        '\n' +
                        '    if won:\n' +
                        '        reward += 100.0 - (guess_count * 5.0)\n' +
                        '    elif done:\n' +
                        '        reward -= 50.0\n' +
                        '    if words_before > 0:\n' +
                        '        reward += (words_before - words_after) / words_before * 10.0\n' +
                        '\n' +
                        '    return np.clip(reward, -10, 10)\n' +
                        '\n' +
                        '\n' +
                        'class QNetwork(nn.Module):\n' +
                        '    """Neural network that estimates Q-values for all possible actions"""\n' +
                        '\n' +
                        '    def __init__(self, state_size: int, action_size: int):\n' +
                        '        super().__init__()\n' +
                        '        self.fc1 = nn.Linear(state_size, 256)\n' +
                        '        self.fc2 = nn.Linear(256, 128)\n' +
                        '        self.fc3 = nn.Linear(128, action_size)\n' +
                        '\n' +
                        '    def forward(self, x):\n' +
                        '        layer_1_output = torch.relu(self.fc1(x))\n' +
                        '        layer_2_output = torch.relu(self.fc2(layer_1_output))\n' +
                        '        return self.fc3(layer_2_output)\n' +
                        '\n' +
                        '\n' +
                        'class DQNBot:\n' +
                        '    def __init__(self, word_list: list[str]):\n' +
                        '        self.game_state = GameState(word_list)\n' +
                        '        self.model_path = Path(\'ML/saved_models/dqn_bot.pth\')\n' +
                        '        self.is_trained = False\n' +
                        '\n' +
                        '        # Network setup\n' +
                        '        self.state_size = 314  # from extract_features()\n' +
                        '        self.action_size = len(word_list)\n' +
                        '        self.q_network = QNetwork(self.state_size, self.action_size)\n' +
                        '        self.target_network = QNetwork(self.state_size, self.action_size)\n' +
                        '        self.target_network.load_state_dict(self.q_network.state_dict())\n' +
                        '\n' +
                        '        # Hyperparameters\n' +
                        '        self.gamma = 0.97  # Discount factor\n' +
                        '        self.epsilon = 0.95  # Current exploration rate\n' +
                        '        self.epsilon_min = 0.03  # Minimum exploration\n' +
                        '        self.epsilon_decay = 0.995   # How fast to reduce exploration\n' +
                        '        self.learning_rate = 0.0001\n' +
                        '        self.target_update_frequency = 1000  # Update target network every 1000 training steps\n' +
                        '        self.training_steps = 0\n' +
                        '        self.optimizer = optim.Adam(self.q_network.parameters(), lr=self.learning_rate)\n' +
                        '\n' +
                        '        # Replay buffer\n' +
                        '        self.replay_buffer = deque(maxlen=10000)  # Stores experiences\n' +
                        '        self.batch_size = 64\n' +
                        '\n' +
                        '    def choose_action(self, epsilon: float) -> str:\n' +
                        '        random_number = random.random()\n' +
                        '        if random_number < epsilon:\n' +
                        '            return random.choice(self.game_state.remaining_words)\n' +
                        '\n' +
                        '        state = extract_features(self.game_state).reshape(1, -1)\n' +
                        '        state_tensor = torch.FloatTensor(state)\n' +
                        '\n' +
                        '        with torch.no_grad():\n' +
                        '            q_values = self.q_network(state_tensor)\n' +
                        '\n' +
                        '        remaining_q_values = q_values[0, self.game_state.remaining_words_indices]\n' +
                        '        best_idx = torch.argmax(remaining_q_values).item()\n' +
                        '        word_idx = self.game_state.remaining_words_indices[best_idx]\n' +
                        '\n' +
                        '        return self.game_state.master_list[word_idx]\n' +
                        '\n' +
                        '    def store_experience(self, state: np.ndarray, action_idx: int, reward: float,\n' +
                        '                         next_state: np.ndarray, done: bool) -> None:\n' +
                        '        """\n' +
                        '        Store experience tuple in replay buffer.\n' +
                        '\n' +
                        '        Args:\n' +
                        '            state: State features before action (314,)\n' +
                        '            action_idx: Index of word that was guessed\n' +
                        '            reward: Reward received\n' +
                        '            next_state: State features after action (314,)\n' +
                        '            done: Whether episode ended (won or lost)\n' +
                        '        """\n' +
                        '        self.replay_buffer.append((state, action_idx, reward, next_state, done))\n' +
                        '\n' +
                        '    def train_step(self) -> float:\n' +
                        '        """\n' +
                        '        Sample batch from replay buffer and perform one training step.\n' +
                        '\n' +
                        '        Returns:\n' +
                        '            float: Loss value (for monitoring)\n' +
                        '        """\n' +
                        '        # Check if we have enough experiences\n' +
                        '        if len(self.replay_buffer) < self.batch_size:\n' +
                        '            return 0.0\n' +
                        '\n' +
                        '        batch = random.sample(self.replay_buffer, self.batch_size)\n' +
                        '\n' +
                        '        states = np.array([exp[0] for exp in batch])\n' +
                        '        actions = np.array([exp[1] for exp in batch])\n' +
                        '        rewards = np.array([exp[2] for exp in batch])\n' +
                        '        next_states = np.array([exp[3] for exp in batch])\n' +
                        '        dones = np.array([exp[4] for exp in batch])\n' +
                        '\n' +
                        '        states_float = torch.FloatTensor(states)\n' +
                        '        actions_long = torch.LongTensor(actions)  # Not FloatTensor\n' +
                        '        rewards_float = torch.FloatTensor(rewards)\n' +
                        '        next_states_float = torch.FloatTensor(next_states)\n' +
                        '        dones_float = torch.FloatTensor(dones)\n' +
                        '\n' +
                        '        #Get current Q-values for actions taken\n' +
                        '        current_q_values  = self.q_network(states_float)\n' +
                        '        current_q = current_q_values.gather(1, actions_long.unsqueeze(1)).squeeze(1)\n' +
                        '\n' +
                        '        with torch.no_grad():  # Don\'t need gradients for target network\n' +
                        '            next_q_values = self.target_network(next_states_float)  # Shape: (batch_size, action_size)\n' +
                        '            max_next_q = next_q_values.max(1)[0]  # Shape: (batch_size,)\n' +
                        '\n' +
                        '        #Calculate target Q-values using Bellman equation\n' +
                        '        target_q = rewards_float + self.gamma * max_next_q * (1 - dones_float)\n' +
                        '\n' +
                        '        loss = nn.MSELoss()(current_q, target_q)\n' +
                        '\n' +
                        '        # Backpropagation\n' +
                        '        self.optimizer.zero_grad()  # Clear previous gradients\n' +
                        '        loss.backward()  # Compute gradients\n' +
                        '        torch.nn.utils.clip_grad_norm_(self.q_network.parameters(), max_norm=1.0)\n' +
                        '        self.optimizer.step()  # Update weights\n' +
                        '\n' +
                        '        # Track training steps and update target network periodically\n' +
                        '        self.training_steps += 1\n' +
                        '        if self.training_steps % self.target_update_frequency == 0:\n' +
                        '            self.target_network.load_state_dict(self.q_network.state_dict())\n' +
                        '\n' +
                        '        return loss.item()  # Return loss value for monitoring\n' +
                        '\n' +
                        '    def make_guess(self) -> str:\n' +
                        '        guess = self.choose_action(epsilon=0)\n' +
                        '        self.game_state.guess_count += 1\n' +
                        '        return guess\n' +
                        '\n' +
                        '    def train(self, num_episodes: int = 1000) -> None:\n' +
                        '        """\n' +
                        '        Train the DQN by playing games and learning from experience.\n' +
                        '\n' +
                        '        Args:\n' +
                        '            num_episodes: Number of games to play during training\n' +
                        '        """\n' +
                        '        if self.model_path.exists():\n' +
                        '            self.load(self.model_path)\n' +
                        '            return\n' +
                        '\n' +
                        '        for i in range(num_episodes):\n' +
                        '            self.game_state.reset()\n' +
                        '            answer = random.choice(self.game_state.master_list)\n' +
                        '            loss = 0\n' +
                        '            while self.game_state.guess_count < 6:\n' +
                        '                pre_state = extract_features(self.game_state)\n' +
                        '                word_count_before = len(self.game_state.remaining_words)\n' +
                        '                guess = self.choose_action(self.epsilon)\n' +
                        '                self.game_state.guess_count += 1\n' +
                        '                score = score_guess(answer, guess)\n' +
                        '                filter_words(guess, score, self.game_state)\n' +
                        '                word_count_after = len(self.game_state.remaining_words)\n' +
                        '                post_state = extract_features(self.game_state)\n' +
                        '                if guess == answer:\n' +
                        '                    reward = calculate_reward(True, False, self.game_state.guess_count,\n' +
                        '                                              word_count_before, word_count_after)\n' +
                        '                    done = True\n' +
                        '                else:\n' +
                        '                    lost = (self.game_state.guess_count >= 6)\n' +
                        '                    reward = calculate_reward(False, lost, self.game_state.guess_count,\n' +
                        '                                              word_count_before, word_count_after)\n' +
                        '                    done = lost  # Episode ends if we lost\n' +
                        '                self.store_experience(pre_state, self.game_state.word_to_index[guess], reward, post_state, done)\n' +
                        '                loss = self.train_step()\n' +
                        '                if done: break\n' +
                        '            self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)\n' +
                        '            if (i + 1) % 100 == 0:  # Print every 100 episodes\n' +
                        '                print(f"Episode {i + 1}/{num_episodes} | Epsilon: {self.epsilon:.3f} | Loss: {loss:.4f}")\n' +
                        '\n' +
                        '        self.is_trained = True\n' +
                        '        self.save(self.model_path)\n' +
                        '        print("Training complete!")\n' +
                        '\n' +
                        '    def save(self, filepath: Path) -> None:\n' +
                        '        """Save trained model to disk."""\n' +
                        '        torch.save({\n' +
                        '            \'q_network_state_dict\': self.q_network.state_dict(),\n' +
                        '            \'target_network_state_dict\': self.target_network.state_dict(),\n' +
                        '            \'optimizer_state_dict\': self.optimizer.state_dict(),\n' +
                        '            \'epsilon\': self.epsilon,\n' +
                        '            \'training_steps\': self.training_steps,\n' +
                        '            \'game_state\': self.game_state.reset(),\n' +
                        '            \'is_trained\': self.is_trained,\n' +
                        '        }, filepath)\n' +
                        '        print(f"Model saved to {filepath}")\n' +
                        '\n' +
                        '    def load(self, filepath: Path) -> None:\n' +
                        '        """Load trained model from disk."""\n' +
                        '        checkpoint = torch.load(filepath)\n' +
                        '        self.q_network.load_state_dict(checkpoint[\'q_network_state_dict\'])\n' +
                        '        self.target_network.load_state_dict(checkpoint[\'target_network_state_dict\'])\n' +
                        '        self.optimizer.load_state_dict(checkpoint[\'optimizer_state_dict\'])\n' +
                        '        self.epsilon = checkpoint[\'epsilon\']\n' +
                        '        self.training_steps = checkpoint[\'training_steps\']'
                },
                {
                    name: 'entropy_maximization_bot.py',
                    language: 'python',
                    icon: faPython,
                    type: 'file',
                    content: 'import numpy as np\n' +
                        '\n' +
                        'from Utilities.game_state import GameState\n' +
                        'from Utilities.shared_utils import get_high_frequency_candidates\n' +
                        '\n' +
                        'class EntropyBot:\n' +
                        '    def __init__(self, word_list: list[str], pattern_table: np.ndarray) -> None:\n' +
                        '        self.game_state = GameState(word_list)\n' +
                        '        self.pattern_table = pattern_table\n' +
                        '\n' +
                        '    def calculate_entropy(self, guess: str) -> float:\n' +
                        '        """\n' +
                        '        Incredibly fast entropy calculation using NumPy broadcasting and bincount.\n' +
                        '\n' +
                        '        Args:\n' +
                        '            guess: The string to calculate entropy for\n' +
                        '\n' +
                        '        """\n' +
                        '        guess_idx = self.game_state.word_to_index[guess]\n' +
                        '\n' +
                        '        # Slice out the scores for this guess against ONLY the remaining words\n' +
                        '        possible_patterns = self.pattern_table[guess_idx, self.game_state.remaining_words_indices]\n' +
                        '\n' +
                        '        counts = np.bincount(possible_patterns)\n' +
                        '        # Filter out patterns that didn\'t happen (where count is 0)\n' +
                        '        active_counts = counts[counts > 0]\n' +
                        '        probabilities = active_counts / len(self.game_state.remaining_words_indices)\n' +
                        '\n' +
                        '        # Vectorized entropy math: -sum(P * log2(P))\n' +
                        '        return -1.0 * np.sum(probabilities * np.log2(probabilities))\n' +
                        '\n' +
                        '    def make_guess(self) -> str:\n' +
                        '        """\n' +
                        '        Make a Guess That Maximizes Entropy in Order to Shrink the Remaining Word List as Much as Possible\n' +
                        '        First Guess is Always "Crane" Due to it Being Optimal\n' +
                        '\n' +
                        '        Returns:\n' +
                        '            str: The Bot\'s guess for that round\n' +
                        '\n' +
                        '        """\n' +
                        '\n' +
                        '        # if self.game_state.guess_count == 0:\n' +
                        '        #     self.game_state.guess_count += 1  # Increment the GameState guess count\n' +
                        '        #     return "crane"\n' +
                        '        #\n' +
                        '        self.game_state.guess_count += 1  # Increment the GameState guess count\n' +
                        '        remaining_words_length = len(self.game_state.remaining_words)\n' +
                        '\n' +
                        '        if remaining_words_length == 1:  #No entropy calculations for just 1 word\n' +
                        '            return self.game_state.remaining_words[0]\n' +
                        '\n' +
                        '        best_word = ""\n' +
                        '        max_entropy = -1\n' +
                        '\n' +
                        '        #If we have a lot of possible words, we just check the top 300 words with high-frequency letters\n' +
                        '        if remaining_words_length > 20:\n' +
                        '            guess_candidates = get_high_frequency_candidates(self.game_state, 300, self.game_state.master_list)\n' +
                        '        else:\n' +
                        '            #Below 20 remaining words is dangerous because we can get stuck in traps like LIGHT, MIGHT, SIGHT, etc.\n' +
                        '            #To combat this, we allow the bot to make a sacrificial guess like "MILES" to rule out LIGHT, MIGHT, and SIGHT\n' +
                        '            guess_candidates = self.game_state.master_list\n' +
                        '\n' +
                        '        for word in guess_candidates:\n' +
                        '            entropy = self.calculate_entropy(word)\n' +
                        '\n' +
                        '            if word in self.game_state.remaining_words:  #This acts as a tiebreaker because we would PREFER to guess a word\n' +
                        '                entropy += 0.01  #that could actually be the answer. So if both are high-entropy, pick one\n' +
                        '                #that COULD actually be the answer.\n' +
                        '\n' +
                        '            if entropy > max_entropy:\n' +
                        '                max_entropy = entropy\n' +
                        '                best_word = word\n' +
                        '\n' +
                        '        return best_word\n'
                },
                {
                    name: 'neural_network_classifier.py',
                    language: 'python',
                    icon: faPython,
                    type: 'file',
                    content: 'import pickle\n' +
                        'from pathlib import Path\n' +
                        '\n' +
                        'import numpy as np\n' +
                        'import torch\n' +
                        'import torch.nn as nn\n' +
                        '\n' +
                        'from ML.base_model import BaseWordleModel\n' +
                        'from Utilities.game_state import GameState\n' +
                        '\n' +
                        '\n' +
                        'class NeuralNetwork(nn.Module):\n' +
                        '    def __init__(self):\n' +
                        '        super().__init__()\n' +
                        '        self.network = nn.Sequential(\n' +
                        '            nn.Linear(314, 256),\n' +
                        '            nn.ReLU(),\n' +
                        '            nn.Linear(256, 128),\n' +
                        '            nn.ReLU(),\n' +
                        '            nn.Linear(128, 26),\n' +
                        '            nn.Sigmoid()\n' +
                        '        )\n' +
                        '\n' +
                        '    def forward(self, x):\n' +
                        '        return self.network(x)\n' +
                        '\n' +
                        '\n' +
                        'class NeuralNetworkClassifier(BaseWordleModel):\n' +
                        '    def __init__(self, word_list: list[str]):\n' +
                        '        super().__init__(model_name="Neural Network Classifier", word_list=word_list)\n' +
                        '        self._model = NeuralNetwork()\n' +
                        '        self.model_path = Path(\'ML/saved_models/neural_network.pkl\')\n' +
                        '\n' +
                        '    def train(self):\n' +
                        '        """\n' +
                        '        Trains the neural network model on the given training data.\n' +
                        '        Will always attempt to load the model first if it exists.\n' +
                        '        """\n' +
                        '        #Attempt to load the model if it exists\n' +
                        '        if self.model_path.exists():\n' +
                        '            saved_bot = self.load(self.model_path)\n' +
                        '            self._model = saved_bot._model\n' +
                        '            self.is_trained = True\n' +
                        '            return\n' +
                        '\n' +
                        '        print("Training Model... this might take a bit")\n' +
                        '        #Otherwise, train a new model and save it\n' +
                        '        try:\n' +
                        '            with open(\'ML/training_data/wordle_training.pkl\', \'rb\') as f:\n' +
                        '                training_data = pickle.load(f)\n' +
                        '        except FileNotFoundError:\n' +
                        '            print("Error: Training data not found. Please ensure you have made training data for this model.")\n' +
                        '            exit()\n' +
                        '        except Exception as e:\n' +
                        '            print(f"An unexpected error occurred while loading the training data: {e}")\n' +
                        '            exit()\n' +
                        '\n' +
                        '        x = np.array([example[0] for example in training_data])\n' +
                        '        y = np.array([example[1] for example in training_data])\n' +
                        '        x_tensor = torch.tensor(x, dtype=torch.float32)\n' +
                        '        y_tensor = torch.tensor(y, dtype=torch.float32)\n' +
                        '        criterion = nn.BCELoss()\n' +
                        '        optimizer = torch.optim.Adam(self._model.parameters(), lr=0.001)\n' +
                        '\n' +
                        '        for i in range(1000):\n' +
                        '            loss = self.train_epoch(optimizer, criterion, x_tensor, y_tensor)\n' +
                        '            if i % 100 == 0:\n' +
                        '                print(f"Loss: {loss} at iteration {i}")\n' +
                        '\n' +
                        '        self.is_trained = True\n' +
                        '        self._model.eval()\n' +
                        '        self.save(self.model_path, False)\n' +
                        '\n' +
                        '    def train_epoch(self, optimizer, criterion, x, y):\n' +
                        '        optimizer.zero_grad()\n' +
                        '        output = self._model(x)\n' +
                        '        loss = criterion(output, y)\n' +
                        '        loss.backward()\n' +
                        '        optimizer.step()\n' +
                        '\n' +
                        '        return loss\n' +
                        '\n' +
                        '    def predict(self, game_state: GameState) -> np.ndarray:\n' +
                        '\n' +
                        '        features = self.engineer_features(game_state).reshape(1, -1)\n' +
                        '        x = torch.tensor(features, dtype=torch.float32)\n' +
                        '\n' +
                        '        with torch.no_grad():\n' +
                        '            output = self._model(x)\n' +
                        '\n' +
                        '        return output.squeeze().numpy()\n'
                },
                {
                    name: 'random_forest_classifier.py',
                    language: 'python',
                    icon: faPython,
                    type: 'file',
                    content: 'import pickle\n' +
                        'from pathlib import Path\n' +
                        '\n' +
                        'import numpy as np\n' +
                        'from numpy import ndarray\n' +
                        '\n' +
                        'from ML.base_model import BaseWordleModel\n' +
                        'from sklearn.ensemble import RandomForestClassifier\n' +
                        'from sklearn.multioutput import MultiOutputClassifier\n' +
                        'from Utilities.game_state import GameState\n' +
                        '\n' +
                        '\n' +
                        'class RandomForestClassifierModel(BaseWordleModel):\n' +
                        '    def __init__(self, word_list: list[str]):\n' +
                        '        super().__init__(model_name="random_forest_classifier", word_list=word_list)\n' +
                        '\n' +
                        '        # Initialize sklearn RandomForestClassifier with defaults\n' +
                        '        self._model = RandomForestClassifier()\n' +
                        '        self.model_path = Path(\'ML/saved_models/random_forest_classifier.pkl\')\n' +
                        '\n' +
                        '    def train(self) -> None:\n' +
                        '        """\n' +
                        '        Loads training data from the disk and trains the model off of it.\n' +
                        '        """\n' +
                        '\n' +
                        '        if self.model_path.exists():\n' +
                        '            saved_bot = self.load(self.model_path)\n' +
                        '            self._model = saved_bot._model\n' +
                        '            self.is_trained = True\n' +
                        '            return\n' +
                        '\n' +
                        '        with open(\'ML/training_data/wordle_training.pkl\', \'rb\') as f:\n' +
                        '            training_data = pickle.load(f)\n' +
                        '\n' +
                        '        print("This bot isn\'t trained yet! Training...")\n' +
                        '        x = np.array([example[0] for example in training_data])  # Features\n' +
                        '        y = np.array([example[1] for example in training_data])  # Labels\n' +
                        '\n' +
                        '        y_binary = (y > 0.35).astype(int)\n' +
                        '\n' +
                        '        #Use parallel jobs ONLY for fit(). Can\'t have anything over n=1 when using multipool/other parallelization\n' +
                        '        self._model = MultiOutputClassifier(RandomForestClassifier(), n_jobs=4)\n' +
                        '        self._model.fit(x, y_binary)\n' +
                        '        self._model.n_jobs = 1\n' +
                        '        self.is_trained = True\n' +
                        '\n' +
                        '        self.save(self.model_path, True)\n' +
                        '\n' +
                        '\n' +
                        '    def predict(self, game_state: GameState) -> ndarray:\n' +
                        '        """\n' +
                        '        Predict letter probabilities for a single game state.\n' +
                        '\n' +
                        '        Args:\n' +
                        '            game_state (GameState): The current state of the game\n' +
                        '\n' +
                        '        Returns:\n' +
                        '            np.ndarray: Shape (26,) with probabilities for letters A-Z\n' +
                        '                        probs[0] = P(letter \'A\' in next guess)\n' +
                        '                        probs[25] = P(letter \'Z\' in next guess)\n' +
                        '        """\n' +
                        '\n' +
                        '        features = self.engineer_features(game_state).reshape(1, -1)\n' +
                        '        proba_list = self._model.predict_proba(features)\n' +
                        '\n' +
                        '        letter_probs = np.zeros(26)\n' +
                        '        for i, proba in enumerate(proba_list):\n' +
                        '            if proba.shape[1] == 2:\n' +
                        '                letter_probs[i] = proba[0, 1]\n' +
                        '            else:\n' +
                        '                # Classifier only saw one class during training\n' +
                        '                # Q seemingly just sucks at being high entropy, so this catches it\n' +
                        '                letter_probs[i] = 0.0\n' +
                        '\n' +
                        '        return letter_probs'
                },
                {
                    name: 'random_forest_regressor.py',
                    language: 'python',
                    icon: faPython,
                    type: 'file',
                    content: 'import pickle\n' +
                        'from pathlib import Path\n' +
                        '\n' +
                        'import numpy as np\n' +
                        'from numpy import ndarray\n' +
                        '\n' +
                        'from ML.base_model import BaseWordleModel\n' +
                        'from sklearn.ensemble import RandomForestRegressor\n' +
                        'from Utilities.game_state import GameState\n' +
                        '\n' +
                        '\n' +
                        'class RandomForestRegressorModel(BaseWordleModel):\n' +
                        '    def __init__(self, word_list: list[str]):\n' +
                        '        super().__init__(model_name="random_forest_regressor", word_list=word_list)\n' +
                        '\n' +
                        '        self.model_path = Path(\'ML/saved_models/random_forest_regressor.pkl\')\n' +
                        '        self._model = RandomForestRegressor(n_estimators=100)\n' +
                        '\n' +
                        '\n' +
                        '    def train(self) -> None:\n' +
                        '        """\n' +
                        '        Loads training data from the disk and trains the model off of it.\n' +
                        '        """\n' +
                        '\n' +
                        '        if self.model_path.exists():\n' +
                        '            saved_bot = self.load(self.model_path)\n' +
                        '            self._model = saved_bot._model\n' +
                        '            self.is_trained = True\n' +
                        '            return\n' +
                        '\n' +
                        '        print("Training model...")\n' +
                        '        with open(\'ML/training_data/wordle_training.pkl\', \'rb\') as f:\n' +
                        '            training_data = pickle.load(f)\n' +
                        '\n' +
                        '        x = np.array([example[0] for example in training_data])  # Features\n' +
                        '        y = np.array([example[1] for example in training_data])  # Labels\n' +
                        '\n' +
                        '        #Use parallel jobs ONLY for fit(). Can\'t have anything over n=1 when using multipool/other parallelization\n' +
                        '        self._model = RandomForestRegressor(n_estimators=100, n_jobs=4)\n' +
                        '        self._model.fit(x, y)\n' +
                        '        self._model.n_jobs = 1\n' +
                        '        self.is_trained = True\n' +
                        '\n' +
                        '        self.save(self.model_path, True)\n' +
                        '\n' +
                        '\n' +
                        '    def predict(self, game_state: GameState) -> ndarray:\n' +
                        '        """\n' +
                        '        Predict letter probabilities for a single game state.\n' +
                        '\n' +
                        '        Args:\n' +
                        '            game_state (GameState): The current state of the game\n' +
                        '\n' +
                        '        Returns:\n' +
                        '            np.ndarray: Shape (26,) with probabilities for letters A-Z\n' +
                        '                        probs[0] = P(letter \'A\' in next guess)\n' +
                        '                        probs[25] = P(letter \'Z\' in next guess)\n' +
                        '        """\n' +
                        '\n' +
                        '        features = self.engineer_features(game_state).reshape(1, -1)\n' +
                        '        letter_probs = self._model.predict(features)[0]\n' +
                        '\n' +
                        '        return letter_probs'
                }]
            },
            {
            name: 'Utilities',
            type: 'folder',
            children: [
                {
                    name: 'data_collector.py',
                    language: 'python',
                    icon: faPython,
                    type: 'file',
                    content: 'from multiprocessing import Pool\n' +
                        'from random import choice\n' +
                        'import pickle\n' +
                        'import numpy as np\n' +
                        '\n' +
                        'from ML.entropy_maximization_bot import EntropyBot\n' +
                        'from ML import entropy_maximization_bot\n' +
                        'from Utilities.shared_utils import (calculate_normalized_letter_freq, score_guess, get_high_frequency_candidates,\n' +
                        '                                    filter_words, extract_features)\n' +
                        '\n' +
                        'worker_pattern_table = None  #Will be initialized on the first run of collect_training_data_parallel()\n' +
                        '\n' +
                        '\n' +
                        'def create_training_labels(bot: entropy_maximization_bot.EntropyBot, k: int):\n' +
                        '    """\n' +
                        '    This function looks at the current state of the bot, find the top K-highest entropy\n' +
                        '    words in the remaining words and then returns label weights for each letter in those words\n' +
                        '\n' +
                        '    Args:\n' +
                        '        k: The number of words to pull from the entropy list\n' +
                        '        bot (entropy_maximization_bot.EntropyBot): The bot that contains the remaining word list and round history\n' +
                        '\n' +
                        '    Returns:\n' +
                        '        np.array: An array of letter labels weights floats\n' +
                        '    """\n' +
                        '\n' +
                        '    if len(bot.game_state.remaining_words) > 20:  #The entropy function is super costly, so we\'re guess_candidates\n' +
                        '        #20 is arbitrary\n' +
                        '        candidates_to_check = min(200, len(bot.game_state.remaining_words) * 2)  #200 is arbitrary\n' +
                        '        guess_candidates = get_high_frequency_candidates(bot.game_state, candidates_to_check)\n' +
                        '    else:\n' +
                        '        guess_candidates = bot.game_state.master_list\n' +
                        '\n' +
                        '    word_entropies = []\n' +
                        '    for word in guess_candidates:  #Get the word entropies from the bot\n' +
                        '        word_entropies.append(bot.calculate_entropy(word))\n' +
                        '\n' +
                        '    entropy_guess_pairs = list(zip(guess_candidates, word_entropies))\n' +
                        '    entropy_guess_pairs.sort(key=lambda x: x[1], reverse=True)\n' +
                        '\n' +
                        '    top_k_words = [pair[0] for pair in entropy_guess_pairs[:k]]\n' +
                        '\n' +
                        '    return calculate_normalized_letter_freq(top_k_words)\n' +
                        '\n' +
                        '\n' +
                        'def _collect_games_worker(args: tuple):\n' +
                        '    """\n' +
                        '    Run games and collect (features, labels) pairs.\n' +
                        '\n' +
                        '    Args:\n' +
                        '        args (tuple): Contains the number of games to run in this process, the number of top entropy words\n' +
                        '        to use (k), and the word list to use.\n' +
                        '    """\n' +
                        '    training_data = []\n' +
                        '    num_games, k, word_list = args\n' +
                        '\n' +
                        '    for x in range(num_games):\n' +
                        '        bot = EntropyBot(word_list, worker_pattern_table)\n' +
                        '        target_word = choice(word_list)\n' +
                        '        guess_count = 0\n' +
                        '\n' +
                        '        while guess_count < 6:\n' +
                        '            training_data.append((\n' +
                        '                extract_features(bot.game_state),\n' +
                        '                create_training_labels(bot, k)\n' +
                        '            ))\n' +
                        '\n' +
                        '            bot_guess = bot.make_guess()\n' +
                        '\n' +
                        '            if bot_guess == target_word:\n' +
                        '                break\n' +
                        '\n' +
                        '            score = score_guess(target_word, bot_guess)\n' +
                        '            filter_words(bot_guess, score, bot.game_state)\n' +
                        '            guess_count += 1\n' +
                        '\n' +
                        '    return training_data\n' +
                        '\n' +
                        '\n' +
                        'def init_worker(pattern_table):\n' +
                        '    global worker_pattern_table\n' +
                        '    worker_pattern_table = pattern_table\n' +
                        '\n' +
                        '\n' +
                        'class TrainingDataCollector:\n' +
                        '    def __init__(self, word_list: list[str], pattern_table: np.ndarray):\n' +
                        '        self.word_list = word_list\n' +
                        '        self.training_data = []\n' +
                        '        self.entropy_pattern_table = pattern_table\n' +
                        '\n' +
                        '    def collect_training_data_parallel(self, num_games: int, k: int = 10, processes: int = 4):\n' +
                        '        """\n' +
                        '        Run games and collect (features, labels) pairs.\n' +
                        '\n' +
                        '        Args:\n' +
                        '            processes: The number of parallel processes to use\n' +
                        '            num_games: Number of games to simulate\n' +
                        '            k: Number of top entropy words to use for labels\n' +
                        '        """\n' +
                        '\n' +
                        '        # Split games across processes\n' +
                        '        games_per_process = num_games // processes\n' +
                        '\n' +
                        '        with Pool(processes=processes, initializer=init_worker, initargs=(self.entropy_pattern_table,)) as pool:\n' +
                        '            args = [(games_per_process, k, self.word_list) for _ in range(processes)]\n' +
                        '            results = pool.map(_collect_games_worker, args)\n' +
                        '\n' +
                        '        # Combine results from all processes\n' +
                        '        for process_data in results:\n' +
                        '            self.training_data.extend(process_data)\n' +
                        '\n' +
                        '        # Save\n' +
                        '        with open(\'ML/training_data/wordle_training.pkl\', \'wb\') as f:\n' +
                        '            pickle.dump(self.training_data, f)'
                },
                {
                    name: 'display.py',
                    language: 'python',
                    icon: faPython,
                    type: 'file',
                    content: 'from colorama import Fore, Back, Style, init\n' +
                        '\n' +
                        '# Initialize colorama for Windows compatibility\n' +
                        'init(autoreset=True)\n' +
                        '\n' +
                        '\n' +
                        'def print_menu(model : int, model_options : list[str]):\n' +
                        '    print("\\nMain Menu\\n"\n' +
                        '          "---------------------------------------------\\n"\n' +
                        '          f"Current Model: {model_options[model-1]}\\n\\n"\n' +
                        '          "Please Choose an Option:\\n"\n' +
                        '          "1. User-Chosen Word\\n"\n' +
                        '          "2. Randomly-Chosen Word\\n"\n' +
                        '          "3. Test The Bot\\n"\n' +
                        '          "4. Generate Training Data\\n"\n' +
                        '          "5. Pick Which Model to Use\\n"\n' +
                        '          "To Quit, Enter \'q\'\\n")\n' +
                        '\n' +
                        '\n' +
                        'def print_wordle_result(word: str, result: list[int]):\n' +
                        '    """\n' +
                        '    Print a Wordle guess with colored output.\n' +
                        '\n' +
                        '    Args:\n' +
                        '        word: The guessed word (5 letters)\n' +
                        '        result: List of integers where:\n' +
                        '                0 = wrong letter (gray)\n' +
                        '                1 = correct letter, wrong position (yellow)\n' +
                        '                2 = correct letter, correct position (green)\n' +
                        '    """\n' +
                        '    output = ""\n' +
                        '    for letter, status in zip(word, result):\n' +
                        '        if status == 2:  # Correct position\n' +
                        '            output += Back.GREEN + Fore.BLACK + f" {letter.upper()} " + Style.RESET_ALL\n' +
                        '        elif status == 1:  # Wrong position\n' +
                        '            output += Back.YELLOW + Fore.BLACK + f" {letter.upper()} " + Style.RESET_ALL\n' +
                        '        else:  # Wrong letter\n' +
                        '            output += Back.WHITE + Fore.BLACK + f" {letter.upper()} " + Style.RESET_ALL\n' +
                        '        output += " "  # Space between letters\n' +
                        '    print(output)\n' +
                        '\n' +
                        '\n' +
                        'def print_game_state(guesses: list[tuple[str, list[int]]]):\n' +
                        '    """\n' +
                        '    Print multiple guesses with their results.\n' +
                        '\n' +
                        '    Args:\n' +
                        '        guesses: List of (word, result) tuples\n' +
                        '    """\n' +
                        '    print("\\nWordle Game State:")\n' +
                        '    print("-" * 30)\n' +
                        '    for word, result in guesses:\n' +
                        '        print_wordle_result(word, result)\n' +
                        '    print("-" * 30)\n' +
                        '\n' +
                        '\n' +
                        'def print_game_start():\n' +
                        '    print("\\nTo Play, Enter a 5-Letter Word to Make a Guess.")\n' +
                        '    print("\\nThe Game Ends With 6 Unsuccessful Guesses or a Correct Guess.")\n' +
                        '    print("\\nWordle Game Start:")\n' +
                        '    print("-" * 30)\n' +
                        '\n' +
                        '\n' +
                        'def print_end_screen(correct_word:str, guess_count:int):\n' +
                        '    print(f"You guessed the word, {correct_word}, in {guess_count} guesses!")'
                },
                {
                    name: 'game_state.py',
                    language: 'python',
                    icon: faPython,
                    type: 'file',
                    content: 'class GameState:\n' +
                        '    def __init__(self, word_list: list[str]) -> None:\n' +
                        '        self.remaining_words_indices = list(range(len(word_list)))\n' +
                        '        self.remaining_words = word_list\n' +
                        '        self.guess_count = 0\n' +
                        '        self.master_list = word_list\n' +
                        '        self.gray_letters = set()\n' +
                        '        self.green_letters = {}\n' +
                        '        self.yellow_letters = set()\n' +
                        '        self.scored_rounds = dict()\n' +
                        '        self.word_to_index = {word: i for i, word in enumerate(word_list)}\n' +
                        '\n' +
                        '\n' +
                        '    def reset(self) -> None:\n' +
                        '        self.remaining_words_indices = list(range(len(self.master_list)))\n' +
                        '        self.remaining_words = self.master_list\n' +
                        '        self.guess_count = 0\n' +
                        '        self.gray_letters = set()\n' +
                        '        self.green_letters = {}\n' +
                        '        self.yellow_letters = set()\n' +
                        '        self.scored_rounds = dict()\n'
                },
                {
                    name: 'shared_utils.py',
                    language: 'python',
                    icon: faPython,
                    type: 'file',
                    content: 'from collections import Counter, defaultdict\n' +
                        'from Utilities.game_state import GameState\n' +
                        'import numpy as np\n' +
                        '\n' +
                        '\n' +
                        'def calculate_normalized_letter_freq(remaining_words: list[str]):\n' +
                        '    """\n' +
                        '    Extract normalized letter frequency from remaining words\n' +
                        '\n' +
                        '    Args:\n' +
                        '        remaining_words (list[str]): List of remaining words\n' +
                        '\n' +
                        '    Returns:\n' +
                        '        np.array: An array containing normalized frequencies of all letters\n' +
                        '\n' +
                        '    """\n' +
                        '    # Count letter frequencies in remaining words\n' +
                        '    letter_freq = Counter()\n' +
                        '    for word in remaining_words:\n' +
                        '        for letter in set(word):\n' +
                        '            letter_freq[letter] += 1\n' +
                        '\n' +
                        '    # Create array for a-z, normalized\n' +
                        '    frequencies = np.zeros(26)\n' +
                        '    total_words = len(remaining_words) if remaining_words else 1\n' +
                        '    for letter in \'abcdefghijklmnopqrstuvwxyz\':\n' +
                        '        frequencies[ord(letter) - ord(\'a\')] = letter_freq[letter] / total_words\n' +
                        '\n' +
                        '    return frequencies\n' +
                        '\n' +
                        '\n' +
                        'def score_guess(correct_word: str, guess: str) -> list[int]:\n' +
                        '    """\n' +
                        '    Scores the Guess For the Current Round.\n' +
                        '    Uses a two-pass algorithm to properly handle duplicate letters:\n' +
                        '    1. First pass: Mark exact matches (green/2)\n' +
                        '    2. Second pass: Mark wrong positions (yellow/1) only if letters remain available\n' +
                        '\n' +
                        '    This ensures that if a letter appears multiple times in the guess but fewer\n' +
                        '    times in the answer, only the appropriate number of instances get marked as\n' +
                        '    yellow/green (matching real Wordle behavior).\n' +
                        '\n' +
                        '    Args:\n' +
                        '        game_state (GameState): GameState object representing the current game state for the bot\n' +
                        '        correct_word (str): The Correct Word for the Wordle Game\n' +
                        '        guess (str): The Guess From the Bot\n' +
                        '\n' +
                        '    Returns:\n' +
                        '        list[int]: A list containing the Score of the Correct Word\n' +
                        '                   2 = correct position (green)\n' +
                        '                   1 = wrong position (yellow)\n' +
                        '                   0 = not in word (gray)\n' +
                        '\n' +
                        '    """\n' +
                        '    result = [0] * len(guess)\n' +
                        '    answer_chars = list(correct_word)\n' +
                        '\n' +
                        '    # First pass: Mark exact matches and remove them from available pool\n' +
                        '    for i, char in enumerate(guess):\n' +
                        '        if char == correct_word[i]:\n' +
                        '            result[i] = 2\n' +
                        '            answer_chars[i] = None  # Mark as used\n' +
                        '\n' +
                        '    # Second pass: Mark wrong positions for remaining letters\n' +
                        '    for i, char in enumerate(guess):\n' +
                        '        if result[i] == 0:  # Not already an exact match\n' +
                        '            if char in answer_chars:\n' +
                        '                result[i] = 1\n' +
                        '                answer_chars[answer_chars.index(char)] = None  # Mark as used\n' +
                        '\n' +
                        '    return result\n' +
                        '\n' +
                        '\n' +
                        'def filter_words(guess: str, result: list[int], game_state: GameState):\n' +
                        '    """\n' +
                        '    Filters the words based off the score response from the game.\n' +
                        '\n' +
                        '    Uses a two-pass algorithm that first collects all the requirements from the score.\n' +
                        '\n' +
                        '    Gray indicates a hard-limit of a given character in answer.\n' +
                        '    Yellow indicates a hard-minimum of a given character in an answer.\n' +
                        '    Green indicates the exact position that a letter must appear.\n' +
                        '\n' +
                        '    The second pass filters the remaining word list to only contain words that match all\n' +
                        '    the rules from the first pass.\n' +
                        '\n' +
                        '    Args:\n' +
                        '        game_state (GameState): GameState object representing the current game state for the bot\n' +
                        '        guess (str): The guessed answer\n' +
                        '        result (list[int]): The score response from the game\n' +
                        '\n' +
                        '    Returns:\n' +
                        '        None\n' +
                        '\n' +
                        '    """\n' +
                        '    # First pass: collect all requirements from the guess\n' +
                        '    letter_min_count = defaultdict(int)  # Minimum times a letter must appear\n' +
                        '    letter_max_count = {}  # Maximum times a letter can appear\n' +
                        '    position_exclusions = defaultdict(set)  # pos -> {letters} (yellow: can\'t be at this position)\n' +
                        '    game_state.scored_rounds[guess] = result\n' +
                        '\n' +
                        '    for pos, (letter, score) in enumerate(zip(guess, result)):\n' +
                        '        if score == 2:  # Green - letter is in the correct position\n' +
                        '            letter_min_count[letter] += 1\n' +
                        '            game_state.green_letters[pos] = letter\n' +
                        '        elif score == 1:  # Yellow - letter is in word but wrong position\n' +
                        '            letter_min_count[letter] += 1\n' +
                        '            position_exclusions[pos].add(letter)\n' +
                        '            game_state.yellow_letters.add(letter)\n' +
                        '        else:  # Gray - letter is not in word, OR we\'ve found all instances\n' +
                        '            # Count how many times this letter appears as green/yellow in the entire guess\n' +
                        '            green_yellow_count = sum(1 for l, s in zip(guess, result) if l == letter and s in [1, 2])\n' +
                        '            if green_yellow_count > 0:\n' +
                        '                # Letter appears exactly this many times (no more)\n' +
                        '                letter_max_count[letter] = green_yellow_count\n' +
                        '            else:\n' +
                        '                # Letter not in word at all\n' +
                        '                letter_max_count[letter] = 0\n' +
                        '                game_state.gray_letters.add(letter)\n' +
                        '\n' +
                        '    # Second pass: filter words based on all requirements\n' +
                        '    filtered_words = []\n' +
                        '    for word in game_state.remaining_words:\n' +
                        '        # Check position requirements (green letters must be in correct spots)\n' +
                        '        if not all(word[pos] == letter for pos, letter in game_state.green_letters.items()):\n' +
                        '            continue\n' +
                        '\n' +
                        '        # Check position exclusions (yellow letters can\'t be in certain positions)\n' +
                        '        if any(word[pos] in excluded_letters for pos, excluded_letters in position_exclusions.items()):\n' +
                        '            continue\n' +
                        '\n' +
                        '        # Check minimum letter counts (green + yellow letters must appear at least this many times)\n' +
                        '        valid = True\n' +
                        '        for letter, min_count in letter_min_count.items():\n' +
                        '            if word.count(letter) < min_count:\n' +
                        '                valid = False\n' +
                        '                break\n' +
                        '\n' +
                        '        if not valid:\n' +
                        '            continue\n' +
                        '\n' +
                        '        # Check maximum letter counts (gray letters limit the count)\n' +
                        '        for letter, max_count in letter_max_count.items():\n' +
                        '            if word.count(letter) > max_count:\n' +
                        '                valid = False\n' +
                        '                break\n' +
                        '\n' +
                        '        if valid:\n' +
                        '            filtered_words.append(word)\n' +
                        '\n' +
                        '    game_state.remaining_words = filtered_words\n' +
                        '    game_state.remaining_words_indices = [game_state.word_to_index[word] for word in game_state.remaining_words]\n' +
                        '\n' +
                        '\n' +
                        'def get_high_frequency_candidates(game_state: GameState, top_n=300, candidate_pool: list = None) -> list:\n' +
                        '    """\n' +
                        '    Get words with the highest letter frequency in remaining words\n' +
                        '\n' +
                        '    Args:\n' +
                        '        game_state (GameState): GameState object representing the current game state for the bot\n' +
                        '        top_n (int): The amount of words the function should return\n' +
                        '        candidate_pool (list): The pool of words to score and rank. Defaults to remaining_words.\n' +
                        '\n' +
                        '    Returns:\n' +
                        '        List: The list of words composed of the most common letters\n' +
                        '\n' +
                        '    """\n' +
                        '    if candidate_pool is None:\n' +
                        '        candidate_pool = game_state.remaining_words\n' +
                        '\n' +
                        '    # Count letter frequencies in remaining words\n' +
                        '    letter_freq = Counter()\n' +
                        '    for word in game_state.remaining_words:\n' +
                        '        for letter in set(word):\n' +
                        '            letter_freq[letter] += 1\n' +
                        '\n' +
                        '    # Score each candidate word by how many high-frequency letters it has\n' +
                        '    scored_candidates = []\n' +
                        '    for word in candidate_pool:\n' +
                        '        score = sum(letter_freq[letter] for letter in set(word))\n' +
                        '        scored_candidates.append((score, word))\n' +
                        '\n' +
                        '    scored_candidates.sort(reverse=True)\n' +
                        '    return [word for _, word in scored_candidates[:top_n]]\n' +
                        '\n' +
                        '\n' +
                        'def extract_features(game_state: GameState):\n' +
                        '    """\n' +
                        '    Extract features from current game state.\n' +
                        '\n' +
                        '    Returns:\n' +
                        '        np.array: Feature vector representing the current state\n' +
                        '    """\n' +
                        '\n' +
                        '    letter_frequencies= calculate_normalized_letter_freq(game_state.remaining_words)\n' +
                        '    green_letters = np.zeros((5, 26), dtype=int)\n' +
                        '    yellow_letters = np.zeros((5, 26), dtype=int)\n' +
                        '    gray_letters = np.zeros(26, dtype=int)\n' +
                        '\n' +
                        '    for guess, score in game_state.scored_rounds.items():\n' +
                        '        for pos, (letter, result) in enumerate(zip(guess, score)):\n' +
                        '            letter_idx = ord(letter) - ord(\'a\')\n' +
                        '            if result == 2:  #If the letter is green, mark that position as green in the character\'s array\n' +
                        '                green_letters[pos, letter_idx] = 1\n' +
                        '            if result == 1:  #If the letter is yellow, mark that position is yellow in that character\'s array\n' +
                        '                yellow_letters[pos, letter_idx] = 1\n' +
                        '            if result == 0:  #If the letter is gray, mark that position as gray in the letter array.\n' +
                        '                gray_letters[letter_idx] = 1\n' +
                        '\n' +
                        '    features = np.concatenate([\n' +
                        '        letter_frequencies,  # 26 values\n' +
                        '        green_letters.flatten(),  # 130 values (5×26)\n' +
                        '        yellow_letters.flatten(),  # 130 values (5×26)\n' +
                        '        gray_letters,  # 26 values\n' +
                        '        [len(game_state.remaining_words) / len(game_state.master_list)],  # 1 value\n' +
                        '        [game_state.guess_count]  # 1 value\n' +
                        '    ])\n' +
                        '\n' +
                        '    return features\n' +
                        '\n' +
                        '\n' +
                        'def calculate_entropy_pattern_table(word_list: list[str]):\n' +
                        '\n' +
                        '    n = len(word_list)\n' +
                        '    pattern_matrix = np.zeros((n, n), dtype=np.uint8)\n' +
                        '    powers_of_3 = np.array([81, 27, 9, 3, 1], dtype=np.uint8)\n' +
                        '\n' +
                        '    print(f"Precomputing {n}x{n} pattern table (this might take a minute, but only happens once)...")\n' +
                        '\n' +
                        '    for i, guess in enumerate(word_list):\n' +
                        '        for j, answer in enumerate(word_list):\n' +
                        '\n' +
                        '            score_list = score_guess(answer, guess)\n' +
                        '\n' +
                        '            score_int = np.sum(np.array(score_list) * powers_of_3)\n' +
                        '            pattern_matrix[i, j] = score_int\n' +
                        '\n' +
                        '    return pattern_matrix\n'
                }]
            },
            {
                name: 'main.py',
                language: 'python',
                icon: faPython,
                type: 'file',
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
                type: 'file',
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
    }
];