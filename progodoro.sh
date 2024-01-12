#!/bin/bash

# Configurable variables
motivation_levels=("low" "med" "hi" "flow") # Add or remove levels as needed
motivation_timers=(3 15 30 0)               # Corresponding timers for each motivation level in minutes
break_timers=(15 12 10 5)                   # Corresponding break timers for each motivation level in minutes

# Log file
log_file="work_log_$(date +'%Y%m%d').txt"

function validate_config() {
  # Check that all arrays have the same length
  if [ ${#motivation_levels[@]} -ne ${#motivation_timers[@]} ] || [ ${#motivation_levels[@]} -ne ${#break_timers[@]} ]; then
    echo "Error: All configuration arrays must have the same length."
    exit 1
  fi

  # Check that all timers are non-negative integers
  for timer in ${motivation_timers[@]} ${break_timers[@]}; do
    if ! [[ $timer =~ ^[0-9]+$ ]]; then
      echo "Error: All timers must be non-negative integers."
      exit 1
    fi
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

function get_index() {
  local value=$1
  for i in "${!motivation_levels[@]}"; do
    if [[ "${motivation_levels[$i]}" = "${value}" ]]; then
      echo "${i}"
      break
    fi
  done
}

function countdown() {
  local timer=$1
  local message=$2
  local count=0

  # Inform the user about the ability to cancel the timer
  echo -e "The timer is about to start. You can cancel it anytime by pressing CTRL+C."

  trap 'echo; log_entry "$message timer canceled after $(printf "%02d:%02d:%02d" $((count / 3600)) $(( (count / 60) % 60)) $((count % 60)))/$(printf "%02d:%02d:%02d" $((timer / 60)) $((timer % 60)) 0)"; read -p "break timer canceled. Would you like to quit or start a work timer? (q/w): " choice; case $choice in q) exit 1 ;; w) read -p "Enter your motivation level (${motivation_levels[*]}): " level; index=$(get_index "$level"); start_timer "$level" "${motivation_timers[$index]}" ;; esac' INT

  for ((remaining = timer * 60; remaining > 0; remaining--)); do
    mins=$((remaining / 60))
    secs=$((remaining % 60))
    printf "\r%s - %02d:%02d left" "$message" "$mins" "$secs"
    sleep 1
    ((count++))
  done

  log_entry "$message timer ended" $count $((timer * 60))
}

function start_timer() {
  local level=$1
  local timer=$2

  echo "The timer is about to start. You can cancel it anytime by pressing CTRL+C."
  read -p $'(Optional message for the work timer log): ' optional_message

  if [ $timer -eq 0 ]; then
    log_entry "$level timer started - Infinite - $optional_message"
  else
    log_entry "$level timer started - $timer minutes - $optional_message"
  fi

  if [ $timer -eq 0 ]; then
    # Infinite timer until manually canceled
    trap 'echo; log_entry "$level timer canceled after $(printf "%02d:%02d:%02d" $((count / 3600)) $(( (count / 60) % 60)) $((count % 60)))"; read -p "Work timer canceled. Would you like to quit or go to a break? (q/b): " choice; case $choice in q) exit 1 ;; b) index=$(get_index "$level"); countdown "${break_timers[$index]}" "Break" ;; esac' INT
    count=0

    while true; do
      printf "\r%s - Elapsed time: %02d:%02d:%02d" "$level" "$((count / 3600))" "$(((count / 60) % 60))" "$((count % 60))"
      sleep 1
      ((count++))
    done
  else
    # Countdown in the terminal
    trap 'echo; log_entry "$level timer canceled after $(printf "%02d:%02d:%02d" $((count / 3600)) $(( (count / 60) % 60)) $((count % 60)))/$(printf "%02d:%02d:%02d" $((timer / 60)) $((timer % 60)) 0)"; read -p "Work timer canceled. Would you like to quit or go to a break? (q/b): " choice; case $choice in q) exit 1 ;; b) index=$(get_index "$level"); countdown "${break_timers[$index]}" "Break" ;; esac' INT
    count=0

    for ((remaining = timer * 60; remaining > 0; remaining--)); do
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

function log_timer() {
  local level=$1
  local timer=$2
  local elapsed_time=$3
  log_entry "$level timer ended - $timer minutes - $optional_message - Elapsed time: $elapsed_time"
}

# Ask for the initial motivation level
while true; do
  read -p "Enter your initial motivation level (${motivation_levels[*]}): " initial_motivation
  initial_motivation=$(echo "$initial_motivation" | tr '[:upper:]' '[:lower:]') # Convert input to lowercase

  # Find the index of the initial motivation level
  initial_index=-1
  for ((i = 0; i < ${#motivation_levels[@]}; i++)); do
    if [ "${motivation_levels[i]}" == "$initial_motivation" ]; then
      initial_index=$i
      break
    fi
  done

  # Check if a valid motivation level was entered
  if [ $initial_index -ne -1 ]; then
    break
  else
    echo "Invalid initial motivation level. Please try again."
  fi
done

# Find the index of the initial motivation level
initial_index=-1
for ((i = 0; i < ${#motivation_levels[@]}; i++)); do
  if [ "${motivation_levels[i]}" == "$initial_motivation" ]; then
    initial_index=$i
    break
  fi
done

validate_config

# Main loop
for ((i = $initial_index; i < ${#motivation_levels[@]}; i++)); do
  level=${motivation_levels[i]}
  timer=${motivation_timers[i]}
  break_timer=${break_timers[i]}

  start_timer "$level" "$timer"
  elapsed_time_format=$(printf "%02d:%02d" "$((count / 60))" "$((count % 60))")
  log_timer "$level" "$timer" "Elapsed time: $elapsed_time_format"

  if [ $i -lt $((${#motivation_levels[@]} - 1)) ]; then
    notify-send "Break Timer" "Take a break for $break_timer minutes!"

    # Countdown for break time
    countdown $break_timer "Break"

    echo ""
    log_timer "Break" "$break_timer" "Elapsed time: 0:00"

    # Ask if motivation level has changed after the break
    read -p $'\nHas motivation level stayed the same, dropped lower, or increased? (s/l/i): ' motivation_change

    # Validate and set timers based on the response
    case $motivation_change in
    s) ;; # Stay the same
    l)
      if [ "$level" == "${motivation_levels[0]}" ]; then
        echo "Cannot decrease motivation from '${motivation_levels[0]}'."
        i=$((i - 1))
      fi
      ;;
    i)
      if [ "$level" == "${motivation_levels[-1]}" ]; then
        echo "Cannot increase motivation from '${motivation_levels[-1]}'."
        i=$((i - 1))
      fi
      ;;
    *)
      echo "Invalid input. Staying at the current motivation level."
      i=$((i - 1))
      ;;
    esac
  fi
done

echo
echo "All work timers completed."
