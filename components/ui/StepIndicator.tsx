import React from 'react';
import { Text, View } from 'react-native';

interface StepIndicatorProps {
  steps: number;
  currentStep: number;
  labels?: string[];
}

export function StepIndicator({ steps, currentStep, labels = [] }: StepIndicatorProps) {
  return (
    <View className="w-full">
      {/* Step label and count */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white text-sm font-semibold">
          {labels[currentStep - 1] || `Step ${currentStep}`}
        </Text>
        <Text className="text-[#8a8a8f] text-xs">
          {currentStep} of {steps}
        </Text>
      </View>

      {/* Progress bar segments */}
      <View className="flex-row gap-1.5">
        {Array.from({ length: steps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <View
              key={stepNumber}
              className={[
                'flex-1 h-1 rounded-full',
                isCompleted
                  ? 'bg-[#c8e000]'
                  : isCurrent
                  ? 'bg-[#c8e000]'
                  : 'bg-[#2a2a30]',
              ].join(' ')}
              style={isCurrent ? { opacity: 0.5 } : undefined}
            />
          );
        })}
      </View>
    </View>
  );
}
