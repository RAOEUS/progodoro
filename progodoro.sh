#!/bin/bash

# Configurable variables
declare -A motivation_config=(["lo"]="1 1" ["med"]="15 12" ["hi"]="30 10" ["flow"]="0 5") # Add or remove levels as needed

# Log file
log_file="work_log_$(date +'%Y%m%d').txt"

# Other variables
motivation_levels=("lo" "med" "hi" "flow") # This is used for increasing or decreasing the motivation level

function validate_config() {
  # Check that all timers are non-negative integers
  for level in "${!motivation_config[@]}"; do
    timers=(${motivation_config[$level]})
    for timer in "${timers[@]}"; do
      if ! [[ $timer =~ ^[0-9]+$ ]]; then
        echo "Error: All timers must be non-negative integers."
        exit 1
      fi
    done
  done
}

function get_current_timestamp() {
  echo "$(date +'%Y-%m-%d %H:%M:%S')"
}

function log_entry() {
  local message=$1
  local elapsed=$2
  local total=$3

  if [ -n "$elapsed" ] && [ -n "$total" ]; then
    message="$message - $(printf "%02d:%02d:%02d" $((elapsed / 3600)) $((elapsed / 60 % 60)) $((elapsed % 60)))/$(printf "%02d:%02d:%02d" $((total / 60)) $((total % 60)) 0)"
  fi

  echo "$(get_current_timestamp) - $message" >>"$log_file"
}

function handle_motivation_change() {
  read -p $"Break timer ended. Has motivation level stayed the same, dropped lower, or increased? (s/l/i): " motivation_change

  case $motivation_change in
  s) ;; # Stay the same
  l)
    if [ "$index" -gt 0 ]; then
      index=$((index - 1))
      level=${motivation_levels[index]}
    else
      echo "You're already at the lowest motivation level."
    fi
    ;;
  i)
    if [ "$index" -lt $((${#motivation_levels[@]} - 1)) ]; then
      index=$((index + 1))
      level=${motivation_levels[index]}
    else
      echo "You're already at the highest motivation level."
    fi
    ;;
  *)
    echo "Invalid input. Staying at the current motivation level."
    ;;
  esac
}

function countdown() {
  local timer=$1
  local message=$2
  local count=0

  # Inform the user about the ability to cancel the timer
  echo -e "The timer is about to start. You can cancel it anytime by pressing CTRL+C."

  trap 'echo; log_entry "$message timer canceled after $(printf "%02d:%02d:%02d" $((count / 3600)) $(( (count / 60) % 60)) $((count % 60)))/$(printf "%02d:%02d:%02d" $((timer / 60)) $((timer % 60)) 0)"; read -p "break timer canceled. Would you like to quit or start a work timer? (q/w): " choice; case $choice in q) exit 1 ;; w) read -p "Enter your motivation level (${!motivation_config[*]}): " level; start_timer "$level" ;; esac' INT

  for ((remaining = timer * 60; remaining > 0; remaining--)); do
    mins=$((remaining / 60))
    secs=$((remaining % 60))
    printf "\r%s - %02d:%02d left" "$message" "$mins" "$secs"
    sleep 1
    ((count++))
  done

  log_entry "$message timer ended" $count $((timer * 60))

  # Ask for motivation level and start a new work timer when the break timer ends naturally
  if [ "$message" == "Break" ]; then
    notify-send "Break Timer" "Break time is up. Please return to the terminal to start a new timer."
    echo
    handle_motivation_change
    start_timer "$level"
  fi
}

function start_timer() {
  local level=$1
  local timers=(${motivation_config[$level]})
  local work_timer=${timers[0]}
  local break_timer=${timers[1]}

  echo "The timer is about to start. You can cancel it anytime by pressing CTRL+C."
  read -p $'(Optional message for the work timer log): ' optional_message

  if [ "$work_timer" -eq 0 ]; then
    log_entry "$level timer started - Infinite - $optional_message"
  else
    log_entry "$level timer started - $work_timer minutes - $optional_message"
  fi

  if [ "$work_timer" -eq 0 ]; then
    # Infinite timer until manually canceled
    trap 'echo; log_entry "$level timer canceled after $(printf "%02d:%02d:%02d" $((count / 3600)) $(( (count / 60) % 60)) $((count % 60)))"; read -p "Work timer canceled. Would you like to quit or go to a break? (q/b): " choice; case $choice in q) exit 1 ;; b) countdown "$break_timer" "Break" ;; esac' INT
    count=0

    while true; do
      printf "\r%s - Elapsed time: %02d:%02d:%02d" "$level" "$((count / 3600))" "$(((count / 60) % 60))" "$((count % 60))"
      sleep 1
      ((count++))
    done
  else
    # Countdown in the terminal
    trap 'echo; log_entry "$level timer canceled after $(printf "%02d:%02d:%02d" $((count / 3600)) $(( (count / 60) % 60)) $((count % 60)))/$(printf "%02d:%02d:%02d" $((work_timer / 60)) $((work_timer % 60)) 0)"; read -p "Work timer canceled. Would you like to quit or go to a break? (q/b): " choice; case $choice in q) exit 1 ;; b) countdown "$break_timer" "Break" ;; esac' INT
    count=0

    for ((remaining = work_timer * 60; remaining > 0; remaining--)); do
      printf "\r%s - %02d:%02d left" "$level" "$((remaining / 60))" "$((remaining % 60))"
      sleep 1
      ((count++))
    done

    # Alert when the timer is up
    notify-send "Work Timer" "$level work time is up. Take a break!"

    # Log end time for non-infinite timers
    log_entry "$level timer ended"
  fi
}

# Ask for the initial motivation level
while true; do
  read -p "Enter your initial motivation level (${!motivation_config[*]}): " initial_motivation
  initial_motivation=$(echo "$initial_motivation" | tr '[:upper:]' '[:lower:]') # Convert input to lowercase

  # Check if a valid motivation level was entered
  if [[ -n ${motivation_config[$initial_motivation]} ]]; then
    break
  else
    echo "Invalid initial motivation level. Please try again."
  fi
done

validate_config

# Main loop
for index in "${!motivation_levels[@]}"; do
  level=${motivation_levels[index]}
  start_timer "$level"
  if [ "$level" != "${motivation_levels[-1]}" ]; then
    echo
    handle_motivation_change
  fi
done

echo
echo "All work timers completed."
