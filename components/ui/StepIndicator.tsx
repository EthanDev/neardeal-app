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
      <View className="flex-row items-center">
        {Array.from({ length: steps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isLast = index === steps - 1;

          return (
            <React.Fragment key={stepNumber}>
              {/* Step circle + label */}
              <View className="items-center">
                <View
                  className={[
                    'w-7 h-7 rounded-full items-center justify-center border-2',
                    isCompleted
                      ? 'bg-[#c8e000] border-[#c8e000]'
                      : isCurrent
                      ? 'bg-transparent border-[#c8e000]'
                      : 'bg-transparent border-[#2a2a30]',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0c0c0f' }}>
                      ✓
                    </Text>
                  ) : (
                    <Text
                      className={[
                        'text-xs font-bold',
                        isCurrent ? 'text-[#c8e000]' : 'text-[#8a8a8f]',
                      ].join(' ')}
                    >
                      {stepNumber}
                    </Text>
                  )}
                </View>
              </View>

              {/* Label right of circle */}
              {labels[index] ? (
                <Text
                  className={[
                    'text-xs ml-2 font-medium',
                    isCompleted || isCurrent ? 'text-[#c8e000]' : 'text-[#8a8a8f]',
                  ].join(' ')}
                  numberOfLines={1}
                >
                  {labels[index]}
                </Text>
              ) : null}

              {/* Connecting line */}
              {!isLast && (
                <View className="flex-1 mx-3">
                  <View
                    className={[
                      'h-px',
                      isCompleted ? 'bg-[#c8e000]' : 'bg-[#2a2a30]',
                    ].join(' ')}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
